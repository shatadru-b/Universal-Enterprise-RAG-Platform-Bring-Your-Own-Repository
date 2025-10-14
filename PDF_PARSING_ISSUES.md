# PDF Parsing Issues & Solutions

## Issue Identified

When uploading `Bill_31976118 (1).pdf`, the text extraction showed:

### Problem 1: Incomplete Text Extraction
```
Expected: "Council Tax leaflet please use the link below"
Actual:   "uncil Tax leaflet please use the link below"
```
Missing "Co" at the beginning indicates incomplete extraction.

### Problem 2: Document Characteristics
Your PDF bill contains:
- **Embedded images** (logos, headers)
- **Complex formatting** (tables, forms, multi-column layout)
- **Mixed content** (text + images)

## Root Cause

**PyPDF2** (current library) has limitations:
- ❌ Struggles with complex layouts
- ❌ Poor handling of multi-column documents
- ❌ Misses text in certain PDF structures
- ❌ Can skip text near images/forms

## Solutions Implemented

### 1. Improved PyPDF2 Extraction ✅
Updated `app/processing/document_processing.py` to:
- Use `extraction_mode="layout"` for better structure preservation
- Add fallback extraction methods
- Clean up whitespace while preserving structure
- Add page markers for better context
- Error handling per page (doesn't fail on one bad page)

### 2. Better Alternatives (Recommended)

Install more robust PDF parsing libraries:

```bash
# Option 1: pdfplumber (RECOMMENDED - best for complex PDFs)
pip install pdfplumber

# Option 2: pdfminer.six (good for text extraction)
pip install pdfminer.six

# Option 3: pypdf (modern PyPDF2 replacement)
pip install pypdf
```

#### Why pdfplumber?
- ✅ Excellent table detection
- ✅ Better multi-column handling
- ✅ Preserves text positioning
- ✅ Extracts text from complex forms
- ✅ Works with image-heavy PDFs

## Testing the Fix

### Step 1: Reset Vector Store
```bash
curl -X POST "http://127.0.0.1:8000/api/reset_vectorstore"
```

### Step 2: Re-upload Your PDF
Upload `Bill_31976118 (1).pdf` through the UI at http://localhost:3001

### Step 3: Check Extracted Text
```bash
curl -s "http://127.0.0.1:8000/api/debug/chromadb" | python3 -m json.tool
```

Look for:
- Complete "Council Tax" text (not "uncil Tax")
- All bill details extracted
- Proper line breaks and structure

## Future Enhancements

### Option A: Use pdfplumber (Best)
```python
import pdfplumber

def extract_with_pdfplumber(doc_bytes):
    with pdfplumber.open(io.BytesIO(doc_bytes)) as pdf:
        text_parts = []
        for page in pdf.pages:
            # Extract text with layout
            text = page.extract_text(layout=True)
            
            # Also extract tables
            tables = page.extract_tables()
            for table in tables:
                table_text = '\n'.join([' | '.join(row) for row in table])
                text += f"\n\n{table_text}"
            
            text_parts.append(text)
        return '\n\n'.join(text_parts)
```

### Option B: OCR for Image-Based PDFs
If PDFs are scanned images:
```bash
pip install pytesseract pdf2image
# Also need tesseract-ocr system package:
brew install tesseract  # macOS
```

## Verification

After the fix, your PDF should extract:
```
[Page 1]
Council Tax leaflet please use the link below
https://www.edinburgh.gov.uk/council-tax/council-tax-bands/1

To make payment of a bill you will need your full 11 digit Council Tax 
account reference number. This is made up of your 8-digit Council Tax 
account number listed at the top of this notice and by adding a 9 at 
the start and a year indicator at the end (For example, 22 for 2022/23, 
23 for 2023/24).

29 August 2024
City of Edinburgh Council
Income and Benefits Division, PO Box 12331,
EDINBURGH, EH7 9DN
```

## Current Status

✅ **Improved extraction logic** (using layout mode + fallbacks)
⚠️ **Still using PyPDF2** (has known limitations)
🔄 **Recommended**: Install pdfplumber for production use

## Action Items

1. Test the improved extraction with your PDF
2. If still incomplete, install pdfplumber
3. Update requirements.txt with chosen library
4. Consider OCR for scanned PDFs
