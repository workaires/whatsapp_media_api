# 📱 WhatsApp Media & Document Sender API

A Node.js API for sending media (photos, videos, and documents) via WhatsApp using the `whatsapp-web.js` library.

## 🚀 Features

- ✅ Send photos, videos, and documents via WhatsApp
- ✅ User-friendly web interface
- ✅ Single media/document upload with preview
- ✅ Multiple files upload (up to 10 files)
- ✅ URL-based media sending
- ✅ QR Code authentication
- ✅ Registered number verification
- ✅ Automatic temporary file cleanup
- ✅ Robust error handling
- ✅ Chrome/Chromium compatibility
- ✅ Video codec support
- ✅ Document format support (PDF, DOC, XLS, PPT, etc.)

## 📋 Prerequisites

- Node.js (version 14 or higher)
- NPM or Yarn
- Modern web browser
- Google Chrome (recommended for better video compatibility)

## 🛠️ Installation

1. **Clone or download the project**
```bash
git clone <repository-url>
cd whatsapp-media-send
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Edit the config.env file
PORT=3000
NODE_ENV=development
UPLOAD_PATH=./uploads
```

4. **Start the server**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## 🌐 How to use

### 1. Access the web interface
Open your browser and go to: `http://localhost:3000`

### 2. Connect WhatsApp
- The API will automatically generate a QR Code
- Scan the QR Code with your WhatsApp
- Wait for connection confirmation

### 3. Send media and documents
- **Send Media**: Send one photo, video, or document at a time
- **Send Document**: Send one document file specifically
- **Send by URL**: Send media from a URL
- Enter phone number in format: `5511999999999`
- Add a caption (optional)
- Select files and send!

## 📡 API Endpoints

### GET `/status`
Check WhatsApp connection status.

**Response:**
```json
{
  "isReady": true,
  "hasQR": false
}
```

### GET `/qr`
Get QR Code for authentication.

**Response:**
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### POST `/send-media`
Send a single media file.

**Parameters:**
- `phone` (string, required): Phone number
- `caption` (string, optional): Media caption
- `media` (file, required): Media file

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/send-media \
  -F "phone=5511999999999" \
  -F "caption=My photo!" \
  -F "media=@/path/to/image.jpg"
```

### POST `/send-multiple-media`
Send multiple media files (API only).

**Parameters:**
- `phone` (string, required): Phone number
- `caption` (string, optional): Caption for first media only
- `media` (files, required): Media files

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/send-multiple-media \
  -F "phone=5511999999999" \
  -F "caption=First photo caption" \
  -F "media=@/path/to/image1.jpg" \
  -F "media=@/path/to/image2.jpg"
```

### POST `/send-media-url`
Send media from URL.

**Parameters:**
- `phone` (string, required): Phone number
- `url` (string, required): Media URL
- `caption` (string, optional): Media caption

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/send-media-url \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "url": "https://example.com/image.jpg",
    "caption": "Photo from URL"
  }'
```

### POST `/send-document`
Send a single document file.

**Parameters:**
- `phone` (string, required): Phone number
- `caption` (string, optional): Document caption
- `document` (file, required): Document file

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/send-document \
  -F "phone=5511999999999" \
  -F "caption=Important document" \
  -F "document=@/path/to/document.pdf"
```

### POST `/send-multiple-documents`
Send multiple document files (API only).

**Parameters:**
- `phone` (string, required): Phone number
- `caption` (string, optional): Caption for first document only
- `documents` (files, required): Document files

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/send-multiple-documents \
  -F "phone=5511999999999" \
  -F "caption=First document caption" \
  -F "documents=@/path/to/document1.pdf" \
  -F "documents=@/path/to/document2.docx"
```

### POST `/disconnect`
Disconnect WhatsApp client.

## 📁 Project Structure

```
whatsapp-media-send/
├── server.js              # Main server
├── package.json           # Project dependencies
├── config.env             # Environment configuration
├── public/
│   └── index.html         # Web interface
├── uploads/               # Temporary uploads directory
└── README.md              # Documentation
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Execution environment | `development` |
| `UPLOAD_PATH` | Uploads directory | `./uploads` |

### Limits

- **Maximum file size**: 100MB (increased for documents)
- **Supported types**: 
  - Images (jpg, png, gif, etc.)
  - Videos (mp4, avi, mov, mkv, webm)
  - Documents (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, rtf, csv, zip, rar, 7z, tar, gz)
- **Multiple files**: Maximum 10 files per request (API only)

## 🔧 Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **whatsapp-web.js** - WhatsApp client
- **Multer** - File upload handling
- **QRCode** - QR Code generation
- **CORS** - Cross-origin resource sharing
- **Puppeteer** - Browser automation

## 📄 Supported Document Types

The API supports the following document formats:

### Office Documents
- **PDF** (.pdf) - Portable Document Format
- **Word** (.doc, .docx) - Microsoft Word documents
- **Excel** (.xls, .xlsx) - Microsoft Excel spreadsheets
- **PowerPoint** (.ppt, .pptx) - Microsoft PowerPoint presentations

### Text Files
- **Text** (.txt) - Plain text files
- **Rich Text** (.rtf) - Rich Text Format
- **CSV** (.csv) - Comma-separated values

### Archives
- **ZIP** (.zip) - Compressed archives
- **RAR** (.rar) - RAR archives
- **7-Zip** (.7z) - 7-Zip archives
- **TAR** (.tar) - Tape archive
- **GZIP** (.gz) - GNU zip compression

## 🚨 Limitations and Considerations

### WhatsApp Web
- This API uses WhatsApp Web, which may have limitations
- WhatsApp may detect automated usage
- Recommended for testing and development

### Video Compatibility
- For better video support, install Google Chrome
- Chromium (Puppeteer default) doesn't support licensed codecs
- Supported video formats: MP4, AVI, MOV, MKV, WEBM

### Production Use
For production use, consider:
- Using the official WhatsApp Business API
- Implementing rate limiting
- Adding authentication
- Configuring HTTPS
- Monitoring and logging

## 🐛 Troubleshooting

### QR Code doesn't appear
- Check if the server is running
- Wait a few seconds for QR Code generation
- Reload the page

### Connection error
- Verify the phone number format is correct
- Ensure the number is registered on WhatsApp
- Try reconnecting WhatsApp

### File not sent
- Check file size (maximum 100MB)
- Ensure it's an image, video, or supported document
- Verify WhatsApp is connected
- For videos, try converting to MP4 with H.264 codec
- For documents, ensure the format is supported

### Video codec error
- Install Google Chrome for better compatibility
- Convert videos to MP4 format with H.264 codec
- Avoid AAC audio codec

### Document sending issues
- Ensure the document format is supported
- Check if the file is not corrupted
- For large documents, try compressing them
- Some document types may not display properly on WhatsApp

## 📝 License

This project is under the MIT license. See the LICENSE file for more details.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Send pull requests

## 📞 Support

If you encounter any issues or have questions, open an issue in the repository. 