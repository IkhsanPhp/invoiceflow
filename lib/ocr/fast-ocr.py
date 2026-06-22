import sys
import os
import pypdfium2 as pdfium
from rapidocr import RapidOCR

def main():
    # Reconfigure stdout to use utf-8 to avoid encoding errors on Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    if len(sys.argv) < 2:
        print("Usage: python fast-ocr.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        doc = pdfium.PdfDocument(pdf_path)
        num_pages = len(doc)
    except Exception as e:
        print(f"Failed to open PDF: {e}", file=sys.stderr)
        sys.exit(1)
        
    try:
        ocr = RapidOCR()
    except Exception as e:
        print(f"Failed to initialize RapidOCR: {e}", file=sys.stderr)
        sys.exit(1)
        
    markdown_content = []
    
    for i in range(num_pages):
        page = doc[i]
        
        # 1. Try to extract digital text first (Fast path)
        try:
            text_page = page.get_textpage()
            text_content = text_page.get_text_range()
        except Exception:
            text_content = ""
            
        # If there is substantial digital text, use it and skip OCR
        if text_content and len(text_content.strip()) > 150:
            page_text = text_content.strip()
        else:
            # 2. Scanned path (OCR)
            try:
                bitmap = page.render(scale=2)
                pil_img = bitmap.to_pil()
                
                ocr_out = ocr(pil_img)
                page_text = ""
                if ocr_out:
                    if hasattr(ocr_out, 'to_markdown') and callable(ocr_out.to_markdown):
                        try:
                            page_text = ocr_out.to_markdown()
                        except Exception:
                            pass
                    
                    if not page_text and ocr_out.txts:
                        page_text = "\n".join(ocr_out.txts)
            except Exception as ocr_err:
                print(f"OCR error on page {i+1}: {ocr_err}", file=sys.stderr)
                page_text = ""
        
        markdown_content.append(f"--- PAGE {i+1} ---\n\n{page_text}\n")
        
    full_text = "\n".join(markdown_content)
    print(full_text)

if __name__ == "__main__":
    main()
