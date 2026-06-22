import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompanyName(name: string): string {
    let clean = name.trim().toUpperCase();
    
    // Remove prefixes: PT, CV, FIRMA, FM (with or without dots, case-insensitive)
    clean = clean.replace(/^(PT\b\.?|CV\b\.?|FIRMA\b\.?|FM\b\.?)\s*/gi, "");
    
    // Remove suffixes: PT, CV, FIRMA, FM, TBK (with or without dots, case-insensitive)
    clean = clean.replace(/\s*(,?\s*(PT\b\.?|CV\b\.?|FIRMA\b\.?|FM\b\.?|TBK\b\.?))$/gi, "");
    
    // Strip leading/trailing punctuation and spaces
    clean = clean.replace(/^[.,\s]+|[.,\s]+$/g, "");
    
    return clean.trim().toUpperCase();
}
