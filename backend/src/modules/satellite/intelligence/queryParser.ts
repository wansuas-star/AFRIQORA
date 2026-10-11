import { AnalysisIntent, GeoBoundingBox } from '../types';

export interface ParsedUserQuery {
  targetLocation: string;
  targetBbox: GeoBoundingBox;
  timeWindowDescription: string;
  dateRange: { start: Date; end: Date };
  analysisIntent: AnalysisIntent;
  targetSiteId?: string;
  rawQuery: string;
  questionCategory: 'change' | 'construction' | 'vegetation' | 'road' | 'stable' | 'objects' | 'limitations' | 'general';
}

export class NaturalLanguageQueryParser {
  private static PRESET_SITES: Record<
    string,
    { name: string; country: string; bbox: GeoBoundingBox; category: string }
  > = {
    'tenke': {
      name: 'Tenke Fungurume Copper-Cobalt Mine',
      country: 'Democratic Republic of Congo',
      bbox: [26.15, -10.65, 26.25, -10.55],
      category: 'mining',
    },
    'kibali': {
      name: 'Kibali Gold Mine',
      country: 'Democratic Republic of Congo',
      bbox: [29.55, 3.12, 29.65, 3.22],
      category: 'mining',
    },
    'richards': {
      name: 'Port of Richards Bay (Coal & Bulk Terminal)',
      country: 'South Africa',
      bbox: [32.02, -28.82, 32.12, -28.72],
      category: 'port',
    },
    'lekki': {
      name: 'Lekki Deep Sea Port & Free Trade Zone',
      country: 'Nigeria',
      bbox: [3.95, 6.42, 4.05, 6.52],
      category: 'port',
    },
    'sandton': {
      name: 'Sandton CBD & Morningside Commercial Belt',
      country: 'South Africa',
      bbox: [28.04, -26.11, 28.07, -26.09],
      category: 'urban',
    },
    'westlands': {
      name: 'Westlands & Parklands Commercial Corridor',
      country: 'Kenya',
      bbox: [36.78, -1.28, 36.82, -1.25],
      category: 'urban',
    },
    'kolwezi': {
      name: 'Kolwezi West Mining & Residential Suburbs',
      country: 'Democratic Republic of Congo',
      bbox: [25.45, -10.74, 25.55, -10.66],
      category: 'mining',
    },
  };

  public static parse(query: string, overrideBbox?: GeoBoundingBox): ParsedUserQuery {
    const q = query.toLowerCase();

    // 1. Resolve Location & Bbox
    let targetLocation = 'African Critical Resource Corridor';
    let targetBbox: GeoBoundingBox = overrideBbox || [26.15, -10.65, 26.25, -10.55];
    let targetSiteId: string | undefined = undefined;

    for (const [key, site] of Object.entries(this.PRESET_SITES)) {
      if (q.includes(key) || q.includes(site.name.toLowerCase())) {
        targetLocation = `${site.name}, ${site.country}`;
        targetBbox = overrideBbox || site.bbox;
        targetSiteId = key;
        break;
      }
    }

    // 2. Resolve Time Window
    let durationDays = 30;
    let timeWindowDescription = 'Last 30 Days';

    if (q.includes('90 days') || q.includes('3 months') || q.includes('quarter')) {
      durationDays = 90;
      timeWindowDescription = 'Last 3 Months (90 Days)';
    } else if (q.includes('6 months') || q.includes('half year') || q.includes('180 days')) {
      durationDays = 180;
      timeWindowDescription = 'Last 6 Months';
    } else if (q.includes('1 year') || q.includes('12 months') || q.includes('annual') || q.includes('year')) {
      durationDays = 365;
      timeWindowDescription = 'Last 1 Year (12 Months)';
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - durationDays * 24 * 60 * 60 * 1000);

    // 3. Resolve Analysis Intent & Question Category
    let analysisIntent: AnalysisIntent = 'general_change';
    let questionCategory: 'change' | 'construction' | 'vegetation' | 'road' | 'stable' | 'objects' | 'limitations' | 'general' = 'general';

    if (q.includes('object') || q.includes('what is visible') || q.includes('present') || q.includes('see in this image')) {
      analysisIntent = 'object_detection';
      questionCategory = 'objects';
    } else if (q.includes('construction') || q.includes('building') || q.includes('infrastructure')) {
      analysisIntent = 'urban_construction';
      questionCategory = 'construction';
    } else if (q.includes('vegetation') || q.includes('tree') || q.includes('clearing') || q.includes('forest') || q.includes('canopy')) {
      analysisIntent = 'vegetation_loss';
      questionCategory = 'vegetation';
    } else if (q.includes('road') || q.includes('surrounding land') || q.includes('path')) {
      analysisIntent = 'general_change';
      questionCategory = 'road';
    } else if (q.includes('unchanged') || q.includes('stable') || q.includes('what remains')) {
      analysisIntent = 'stability_check';
      questionCategory = 'stable';
    } else if (q.includes('people') || q.includes('person') || q.includes('car') || q.includes('license') || q.includes('cannot establish')) {
      analysisIntent = 'image_understanding';
      questionCategory = 'limitations';
    } else if (q.includes('port') || q.includes('ship') || q.includes('vessel') || q.includes('maritime')) {
      analysisIntent = 'port_vessel_activity';
      questionCategory = 'objects';
    } else if (q.includes('mine') || q.includes('pit') || q.includes('expansion') || q.includes('excavation')) {
      analysisIntent = 'mining_expansion';
      questionCategory = 'change';
    } else if (q.includes('change') || q.includes('differences')) {
      analysisIntent = 'general_change';
      questionCategory = 'change';
    }

    return {
      targetLocation,
      targetBbox,
      timeWindowDescription,
      dateRange: { start: startDate, end: now },
      analysisIntent,
      targetSiteId,
      rawQuery: query,
      questionCategory,
    };
  }

  public static parseQuery(query: string, overrideBbox?: GeoBoundingBox): ParsedUserQuery {
    return this.parse(query, overrideBbox);
  }
}
