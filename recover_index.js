const fs = require('fs');
const readline = require('readline');

async function processTranscript(path, replacements) {
  if (!fs.existsSync(path)) return;
  const fileStream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const call of obj.tool_calls) {
          if (call.name.includes('replace_file_content')) {
            const args = call.args || call.arguments;
            let targetFile = args.TargetFile;
            if (typeof targetFile === 'string' && targetFile.startsWith('"')) targetFile = JSON.parse(targetFile);
            
            if (targetFile && (targetFile.includes('server\\\\index.js') || targetFile.includes('server/index.js') || targetFile.includes('server\\index.js'))) {
              if (call.name.includes('multi')) {
                 let chunksStr = args.ReplacementChunks;
                 if (typeof chunksStr === 'string' && chunksStr.startsWith('"')) {
                     chunksStr = JSON.parse(chunksStr);
                 }
                 let chunks = typeof chunksStr === 'string' ? JSON.parse(chunksStr) : chunksStr;
                 for (const chunk of chunks) {
                   replacements.push({ target: chunk.TargetContent, replacement: chunk.ReplacementContent });
                 }
              } else {
                 let target = args.TargetContent;
                 let replacement = args.ReplacementContent;
                 if (typeof target === 'string' && target.startsWith('"')) target = JSON.parse(target);
                 if (typeof replacement === 'string' && replacement.startsWith('"')) replacement = JSON.parse(replacement);
                 replacements.push({ target, replacement });
              }
            }
          }
        }
      }
    } catch (e) {
    }
  }
}

async function main() {
  const replacements = [];
  await processTranscript('C:\\\\Users\\\\hp\\\\.gemini\\\\antigravity-ide\\\\brain\\\\c6bb4216-e95f-43ee-8735-4b2d54b4423e\\\\.system_generated\\\\logs\\\\transcript.jsonl', replacements);
  await processTranscript('C:\\\\Users\\\\hp\\\\.gemini\\\\antigravity-ide\\\\brain\\\\2ed716a4-7a51-47b0-b1dd-8e2f8f45c8b3\\\\.system_generated\\\\logs\\\\transcript.jsonl', replacements);
  
  console.log('Total replacements found:', replacements.length);
  if (replacements.length === 0) return;
  
  let code = fs.readFileSync('server/index.js', 'utf8').replace(/\\r\\n/g, '\\n');
  let applied = 0;
  for (const { target, replacement } of replacements) {
    const t = target.replace(/\\r\\n/g, '\\n');
    const r = replacement.replace(/\\r\\n/g, '\\n');
    
    if (code.includes(t)) {
      code = code.replace(t, r);
      applied++;
    } else {
      console.log('Could not find target:', t.substring(0, 50).replace(/\\n/g, ' '));
    }
  }
  
  console.log('Successfully applied:', applied);
  fs.writeFileSync('server/index.js.recovered', code);
}
main();
