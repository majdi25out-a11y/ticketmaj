import { Ticket, Developer, Status, Priority, Platform } from '../types';

export interface ParsedTicketRow {
  index: number;
  selected: boolean;
  raw: Record<string, any>;
  parsed: Partial<Ticket>;
  isValid: boolean;
  warnings: string[];
  matchedDev?: Developer;
}

export interface ImportParseResult {
  sheetNames: string[];
  currentSheet: string;
  totalRows: number;
  validCount: number;
  rows: ParsedTicketRow[];
  headers: string[];
  error?: string;
}

/**
 * Normalizes header string to ease fuzzy matching
 */
const normalizeKey = (key: string): string => {
  return (key || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Normalizes status values in French and English
 */
export const normalizeStatus = (val?: any): Status => {
  if (!val) return 'pending';
  const str = String(val).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (str.includes('term') || str.includes('done') || str.includes('resol') || str.includes('clos') || str.includes('finish')) {
    return 'completed';
  }
  if (str.includes('cours') || str.includes('prog') || str.includes('doing') || str.includes('dev') || str.includes('assign')) {
    return 'in_progress';
  }
  if (str.includes('rej') || str.includes('refus') || str.includes('cancel') || str.includes('annul')) {
    return 'rejected';
  }
  if (str.includes('val') || str.includes('approv')) {
    return 'approved';
  }
  return 'pending';
};

/**
 * Normalizes priority values in French and English
 */
export const normalizePriority = (val?: any): Priority => {
  if (!val) return 'medium';
  const str = String(val).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (str.includes('urg') || str.includes('crit') || str === 'p1' || str === '1') {
    return 'urgent';
  }
  if (str.includes('haut') || str.includes('high') || str.includes('elev') || str === 'p2' || str === '2') {
    return 'high';
  }
  if (str.includes('bass') || str.includes('low') || str.includes('faibl') || str === 'p4' || str === '4') {
    return 'low';
  }
  return 'medium';
};

/**
 * Normalizes platform
 */
export const normalizePlatform = (val?: any): Platform => {
  if (!val) return 'web';
  const str = String(val).toLowerCase().trim();
  if (str.includes('mob') || str.includes('android') || str.includes('ios') || str.includes('app')) {
    return 'mobile';
  }
  return 'web';
};

/**
 * Convert Excel date (serial number or formatted string) to human readable string
 */
export const parseExcelDate = (val?: any): string => {
  if (!val) {
    return new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // If number, Excel date serial (starts 1900-01-01)
  if (typeof val === 'number') {
    try {
      const utc_days = Math.floor(val - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      if (!isNaN(date_info.getTime())) {
        return date_info.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    } catch (_e) {}
  }

  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return str;
};

/**
 * Parses raw JSON rows from SheetJS into structured tickets
 */
export const transformRowsToTickets = (
  rawRows: Record<string, any>[],
  developers: Developer[] = [],
  defaultValues: {
    status?: Status;
    platform?: Platform;
    priority?: Priority;
    generateNewIds?: boolean;
    defaultAuthor?: string;
  } = {}
): ParsedTicketRow[] => {
  return rawRows.map((row, index) => {
    const warnings: string[] = [];
    let id = '';
    let title = '';
    let description = '';
    let status: Status = defaultValues.status || 'pending';
    let priority: Priority = defaultValues.priority || 'medium';
    let platform: Platform = defaultValues.platform || 'web';
    let requestedBy = defaultValues.defaultAuthor || 'Utilisateur Importé';
    let devNameOrEmail = '';
    let createdDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let slaDeadline = '';
    let tags: string[] = ['EXCEL'];
    let clarity: 'clair' | 'clarifier' = 'clair';
    let closingNote = '';

    // Iterate through all columns in the row and match flexibly
    for (const [colName, rawVal] of Object.entries(row)) {
      if (rawVal === undefined || rawVal === null || rawVal === '') continue;
      const normCol = normalizeKey(colName);
      const valStr = String(rawVal).trim();

      // Title
      if (normCol === 'titre' || normCol === 'title' || normCol === 'nom' || normCol === 'sujet' || normCol === 'nomduticket' || normCol === 'libelle' || normCol === 'ticket') {
        title = valStr;
      }
      // Description
      else if (normCol === 'description' || normCol === 'details' || normCol === 'contenu' || normCol === 'body' || normCol === 'resume') {
        description = valStr;
      }
      // ID
      else if (normCol === 'id' || normCol === 'idticket' || normCol === 'ticketid' || normCol === 'numero' || normCol === 'code' || normCol === 'reference' || normCol === 'ref') {
        id = valStr;
      }
      // Status
      else if (normCol === 'statut' || normCol === 'status' || normCol === 'etat') {
        status = normalizeStatus(valStr);
      }
      // Priority
      else if (normCol === 'priorite' || normCol === 'priority' || normCol === 'urgence' || normCol === 'gravite') {
        priority = normalizePriority(valStr);
      }
      // Platform
      else if (normCol === 'plateforme' || normCol === 'platform' || normCol === 'environnement' || normCol === 'os') {
        platform = normalizePlatform(valStr);
      }
      // Requested By / Author
      else if (normCol === 'demandepar' || normCol === 'demandeur' || normCol === 'requestedby' || normCol === 'auteur' || normCol === 'author' || normCol === 'createur') {
        requestedBy = valStr;
      }
      // Assigned Dev
      else if (normCol === 'assignea' || normCol === 'assignedto' || normCol === 'developpeur' || normCol === 'dev' || normCol === 'assignee' || normCol === 'responsable') {
        devNameOrEmail = valStr;
      }
      // Date created
      else if (normCol === 'date' || normCol === 'datedecreation' || normCol === 'createddate' || normCol === 'creele' || normCol === 'datecreation') {
        createdDate = parseExcelDate(rawVal);
      }
      // SLA Deadline
      else if (normCol === 'sla' || normCol === 'sladeadline' || normCol === 'echeance' || normCol === 'deadline' || normCol === 'datelimite') {
        slaDeadline = parseExcelDate(rawVal);
      }
      // Tags
      else if (normCol === 'tags' || normCol === 'motscles' || normCol === 'etiquettes' || normCol === 'categories') {
        tags = valStr
          .split(/[,;|\n]/)
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean);
        if (tags.length === 0) tags = ['EXCEL'];
      }
      // Clarity
      else if (normCol === 'clarte' || normCol === 'clarity') {
        clarity = valStr.toLowerCase().includes('clarif') ? 'clarifier' : 'clair';
      }
      // Closing Note
      else if (normCol === 'notedecloture' || normCol === 'closingnote' || normCol === 'resolution' || normCol === 'solution') {
        closingNote = valStr;
      }
    }

    // Validation checks
    let isValid = true;
    if (!title) {
      if (description) {
        // Use first line of description as title if title is omitted
        const firstLine = description.split('\n')[0].slice(0, 60);
        title = firstLine || `Ticket #${index + 1}`;
        warnings.push('Titre généré automatiquement à partir de la description.');
      } else {
        title = `Ticket #${index + 1}`;
        warnings.push('Titre manquant dans la ligne Excel.');
      }
    }

    // ID resolution
    if (defaultValues.generateNewIds || !id) {
      id = `TF-${Math.floor(8000 + Math.random() * 1999)}`;
    } else if (!id.startsWith('TF-') && !id.startsWith('#')) {
      id = `TF-${id}`;
    }

    // Match Assigned Developer
    let matchedDev: Developer | undefined = undefined;
    if (devNameOrEmail && developers.length > 0) {
      const target = devNameOrEmail.toLowerCase().trim();
      matchedDev = developers.find((d) => {
        const dName = (d.name || '').toLowerCase().trim();
        const dEmail = (d.email || '').toLowerCase().trim();
        return (
          dName === target ||
          dEmail === target ||
          dName.includes(target) ||
          target.includes(dName) ||
          (target.split(' ')[0] && dName.includes(target.split(' ')[0]))
        );
      });

      if (!matchedDev) {
        warnings.push(`Développeur « ${devNameOrEmail} » non trouvé dans l'équipe.`);
      }
    }

    // Generate status label in French
    let statusLabel = 'À VALIDER';
    if (status === 'in_progress') statusLabel = 'EN COURS';
    else if (status === 'completed') statusLabel = 'TERMINÉ';
    else if (status === 'rejected') statusLabel = 'REJETÉ';
    else if (status === 'approved') statusLabel = 'VALIDÉ';

    const parsedTicket: Partial<Ticket> = {
      id,
      title,
      description: description || 'Importé depuis fichier Excel.',
      requestedBy: requestedBy || 'Utilisateur',
      requestedByAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      assignedTo: matchedDev,
      status,
      statusLabel,
      priority,
      platform,
      createdDate,
      slaDeadline: slaDeadline || undefined,
      tags: tags.length > 0 ? tags : ['EXCEL'],
      clarity,
      closingNote: closingNote || undefined,
      comments: [],
      attachments: [],
      history: [
        {
          id: `h-${Date.now()}-${index}`,
          title: 'Ticket importé via fichier Excel',
          author: requestedBy || 'Système',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: true,
        },
      ],
    };

    return {
      index,
      selected: true,
      raw: row,
      parsed: parsedTicket,
      isValid,
      warnings,
      matchedDev,
    };
  });
};

/**
 * Reads and parses an uploaded Excel (.xlsx, .xls) or CSV file
 */
export const parseExcelFile = async (
  file: File,
  developers: Developer[] = [],
  sheetIndexOrName?: number | string
): Promise<ImportParseResult> => {
  try {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      raw: false,
    });

    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return {
        sheetNames: [],
        currentSheet: '',
        totalRows: 0,
        validCount: 0,
        rows: [],
        headers: [],
        error: 'Le fichier Excel ne contient aucune feuille de calcul valide.',
      };
    }

    let targetSheetName = sheetNames[0];
    if (typeof sheetIndexOrName === 'string' && sheetNames.includes(sheetIndexOrName)) {
      targetSheetName = sheetIndexOrName;
    } else if (typeof sheetIndexOrName === 'number' && sheetNames[sheetIndexOrName]) {
      targetSheetName = sheetNames[sheetIndexOrName];
    }

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      return {
        sheetNames,
        currentSheet: targetSheetName,
        totalRows: 0,
        validCount: 0,
        rows: [],
        headers: [],
        error: `La feuille « ${targetSheetName} » est introuvable.`,
      };
    }

    // Convert sheet to JSON rows with headers
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    });

    if (!rawRows || rawRows.length === 0) {
      return {
        sheetNames,
        currentSheet: targetSheetName,
        totalRows: 0,
        validCount: 0,
        rows: [],
        headers: [],
        error: 'La feuille sélectionnée ne contient aucune ligne de données.',
      };
    }

    // Extract headers from first row keys
    const headers = Object.keys(rawRows[0] || {});

    // Transform into structured rows
    const rows = transformRowsToTickets(rawRows, developers);
    const validCount = rows.filter((r) => r.isValid).length;

    return {
      sheetNames,
      currentSheet: targetSheetName,
      totalRows: rows.length,
      validCount,
      rows,
      headers,
    };
  } catch (err: any) {
    console.error('Erreur de lecture du fichier Excel :', err);
    return {
      sheetNames: [],
      currentSheet: '',
      totalRows: 0,
      validCount: 0,
      rows: [],
      headers: [],
      error: `Échec lors de la lecture du fichier Excel : ${err.message || 'Format de fichier non reconnu'}`,
    };
  }
};

/**
 * Generates and downloads a pre-formatted Excel template file
 */
export const downloadExcelTemplate = async () => {
  try {
    const XLSX = await import('xlsx');

    const templateHeaders = [
      'ID Ticket',
      'Titre du Ticket',
      'Description',
      'Statut',
      'Priorité',
      'Demandeur',
      'Assigné à (Dev)',
      'Plateforme',
      'Date de Création',
      'Échéance SLA',
      'Tags',
      'Clarté',
    ];

    const sampleRows = [
      [
        'TF-9101',
        'Correction bug affichage tableau de bord sur Safari',
        'Les cartes KPI ne respectent pas le bon espacement flexbox sur Safari iOS 17.',
        'À valider',
        'Haute',
        'Sophie Laurent',
        'Alexandre Chen',
        'Web',
        new Date().toLocaleDateString('fr-FR'),
        '4h',
        'UI, BUG, SAFARI',
        'Clair',
      ],
      [
        'TF-9102',
        'Intégration notifications push mobiles lors de la clôture',
        'Envoyer une alerte native sur iOS/Android dès qu un ticket passe au statut Terminé.',
        'En cours',
        'Urgente',
        'Marc Valin',
        'Sarah Benali',
        'Mobile',
        new Date().toLocaleDateString('fr-FR'),
        '2h',
        'FEATURE, PUSH, MOBILE',
        'Clair',
      ],
      [
        'TF-9103',
        'Optimisation requête MySQL pour la recherche plein texte',
        'Ajouter un index full-text sur la table tickets pour accélérer la recherche par mots-clés.',
        'À valider',
        'Moyenne',
        'Antoine Roy',
        '',
        'Web',
        new Date().toLocaleDateString('fr-FR'),
        '8h',
        'DATABASE, PERF',
        'Clair',
      ],
    ];

    const rows = [templateHeaders, ...sampleRows];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 14 }, // ID
      { wch: 38 }, // Titre
      { wch: 45 }, // Description
      { wch: 16 }, // Statut
      { wch: 14 }, // Priorité
      { wch: 20 }, // Demandeur
      { wch: 20 }, // Assigné à
      { wch: 14 }, // Plateforme
      { wch: 18 }, // Date
      { wch: 16 }, // SLA
      { wch: 22 }, // Tags
      { wch: 12 }, // Clarté
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modèle Import Tickets');

    XLSX.writeFile(workbook, 'Modele_Import_Tickets_TicketFlow.xlsx');
  } catch (err) {
    console.error('Erreur lors de la génération du modèle Excel :', err);
  }
};
