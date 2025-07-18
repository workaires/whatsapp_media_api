const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
require('dotenv').config({ path: './config.env' });

function getChromePath() {
  const paths = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ],
    linux: [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser'
    ]
  };

  const platformPaths = paths[process.platform] || [];
  
  for (const chromePath of platformPaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  return null;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check for images, videos, and documents
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('application/')) {
      if (file.mimetype.startsWith('video/')) {
        const allowedVideoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (!allowedVideoExtensions.includes(fileExtension)) {
          return cb(new Error('Video format not supported. Use: MP4, AVI, MOV, MKV or WEBM'), false);
        }
      }
      
      // Check for supported document types
      if (file.mimetype.startsWith('application/')) {
        const allowedDocumentExtensions = [
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
          '.txt', '.rtf', '.csv', '.zip', '.rar', '.7z', '.tar', '.gz'
        ];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (!allowedDocumentExtensions.includes(fileExtension)) {
          return cb(new Error('Document format not supported. Use: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF, CSV, ZIP, RAR, 7Z, TAR, GZ'), false);
        }
      }
      
      cb(null, true);
    } else {
      cb(new Error('Only image, video, and document files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // Increased to 100MB for documents
  }
});

const chromePath = getChromePath();
const puppeteerConfig = {
  headless: true,
  args: [
    '--no-sandbox', 
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
};

if (chromePath) {
  puppeteerConfig.executablePath = chromePath;
  console.log(`Using installed Chrome: ${chromePath}`);
} else {
  console.log('Chrome not found, using Puppeteer Chromium');
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: puppeteerConfig
});

let qrCodeData = null;
let isClientReady = false;

client.on('qr', async (qr) => {
  console.log('QR Code received');
  try {
    qrCodeData = await qrcode.toDataURL(qr);
  } catch (err) {
    console.error('Error generating QR Code:', err);
  }
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
  isClientReady = true;
  qrCodeData = null;
});

client.on('authenticated', () => {
  console.log('WhatsApp authenticated!');
});

client.on('auth_failure', (msg) => {
  console.error('WhatsApp authentication failed:', msg);
  isClientReady = false;
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp client disconnected:', reason);
  isClientReady = false;
});

client.initialize();

app.get('/status', (req, res) => {
  res.json({
    isReady: isClientReady,
    hasQR: qrCodeData !== null
  });
});

app.get('/qr', (req, res) => {
  if (qrCodeData) {
    res.json({ qrCode: qrCodeData });
  } else if (isClientReady) {
    res.json({ message: 'Client already authenticated' });
  } else {
    res.status(404).json({ error: 'QR Code not available' });
  }
});

app.post('/send-media', upload.single('media'), async (req, res) => {
  try {
    if (!isClientReady) {
      return res.status(400).json({ 
        error: 'WhatsApp client is not ready. Scan the QR Code first.' 
      });
    }

    const { phone, caption } = req.body;
    const mediaFile = req.file;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!mediaFile) {
      return res.status(400).json({ error: 'Media file is required' });
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.endsWith('@c.us')) {
      formattedPhone += '@c.us';
    }

    const isRegistered = await client.isRegisteredUser(formattedPhone);
    if (!isRegistered) {
      return res.status(400).json({ error: 'Number not registered on WhatsApp' });
    }

    const fileExtension = path.extname(mediaFile.originalname).toLowerCase();
    const isVideo = mediaFile.mimetype.startsWith('video/');
    
    let media;
    try {
      media = MessageMedia.fromFilePath(mediaFile.path);
    } catch (error) {
      if (isVideo && error.message.includes('codec')) {
        return res.status(400).json({ 
          error: 'Video format not supported. Try converting to MP4 with H.264 codec',
          details: 'Chromium does not support licensed codecs like AAC and H.264'
        });
      }
      throw error;
    }
    
    const result = await client.sendMessage(formattedPhone, media, {
      caption: caption || ''
    });

    fs.unlinkSync(mediaFile.path);

    res.json({
      success: true,
      messageId: result.id._serialized,
      message: 'Media sent successfully!'
    });

  } catch (error) {
    console.error('Error sending media:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Error sending media',
      details: error.message 
    });
  }
});

app.post('/send-multiple-media', upload.array('media', 10), async (req, res) => {
  try {
    if (!isClientReady) {
      return res.status(400).json({ 
        error: 'WhatsApp client is not ready. Scan the QR Code first.' 
      });
    }

    const { phone, caption } = req.body;
    const mediaFiles = req.files;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return res.status(400).json({ error: 'Media files are required' });
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.endsWith('@c.us')) {
      formattedPhone += '@c.us';
    }

    const isRegistered = await client.isRegisteredUser(formattedPhone);
    if (!isRegistered) {
      return res.status(400).json({ error: 'Number not registered on WhatsApp' });
    }

    const results = [];

    for (let i = 0; i < mediaFiles.length; i++) {
      try {
        const media = MessageMedia.fromFilePath(mediaFiles[i].path);
        const mediaCaption = i === 0 ? (caption || '') : '';
        
        const result = await client.sendMessage(formattedPhone, media, {
          caption: mediaCaption
        });

        results.push({
          file: mediaFiles[i].originalname,
          messageId: result.id._serialized,
          success: true
        });

        fs.unlinkSync(mediaFiles[i].path);

      } catch (error) {
        results.push({
          file: mediaFiles[i].originalname,
          success: false,
          error: error.message
        });

        if (fs.existsSync(mediaFiles[i].path)) {
          fs.unlinkSync(mediaFiles[i].path);
        }
      }
    }

    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('Error sending multiple media:', error);
    
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ 
      error: 'Error sending multiple media',
      details: error.message 
    });
  }
});

app.post('/send-media-url', async (req, res) => {
  try {
    if (!isClientReady) {
      return res.status(400).json({
        error: 'WhatsApp client is not ready. Scan the QR Code first.'
      });
    }

    const { phone, url, caption } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    if (!url) {
      return res.status(400).json({ error: 'Media URL is required' });
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.endsWith('@c.us')) {
      formattedPhone += '@c.us';
    }

    const isRegistered = await client.isRegisteredUser(formattedPhone);
    if (!isRegistered) {
      return res.status(400).json({ error: 'Number not registered on WhatsApp' });
    }

    const media = await MessageMedia.fromUrl(url);
    if (!media) {
      return res.status(400).json({ error: 'Could not download media from URL' });
    }

    const result = await client.sendMessage(formattedPhone, media, {
      caption: caption || ''
    });

    res.json({
      success: true,
      messageId: result.id._serialized,
      message: 'Media sent successfully via URL!'
    });
  } catch (error) {
    console.error('Error sending media by URL:', error);
    res.status(500).json({
      error: 'Error sending media by URL',
      details: error.message
    });
  }
});

app.post('/send-document', upload.single('document'), async (req, res) => {
  try {
    if (!isClientReady) {
      return res.status(400).json({ 
        error: 'WhatsApp client is not ready. Scan the QR Code first.' 
      });
    }

    const { phone, caption } = req.body;
    const documentFile = req.file;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!documentFile) {
      return res.status(400).json({ error: 'Document file is required' });
    }

    // Check if it's actually a document
    if (!documentFile.mimetype.startsWith('application/')) {
      return res.status(400).json({ error: 'Only document files are allowed for this endpoint' });
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.endsWith('@c.us')) {
      formattedPhone += '@c.us';
    }

    const isRegistered = await client.isRegisteredUser(formattedPhone);
    if (!isRegistered) {
      return res.status(400).json({ error: 'Number not registered on WhatsApp' });
    }

    const media = MessageMedia.fromFilePath(documentFile.path);
    
    const result = await client.sendMessage(formattedPhone, media, {
      caption: caption || ''
    });

    fs.unlinkSync(documentFile.path);

    res.json({
      success: true,
      messageId: result.id._serialized,
      message: 'Document sent successfully!',
      fileName: documentFile.originalname
    });

  } catch (error) {
    console.error('Error sending document:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Error sending document',
      details: error.message 
    });
  }
});

app.post('/send-multiple-documents', upload.array('documents', 10), async (req, res) => {
  try {
    if (!isClientReady) {
      return res.status(400).json({ 
        error: 'WhatsApp client is not ready. Scan the QR Code first.' 
      });
    }

    const { phone, caption } = req.body;
    const documentFiles = req.files;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!documentFiles || documentFiles.length === 0) {
      return res.status(400).json({ error: 'Document files are required' });
    }

    // Check if all files are documents
    for (const file of documentFiles) {
      if (!file.mimetype.startsWith('application/')) {
        return res.status(400).json({ error: 'Only document files are allowed for this endpoint' });
      }
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.endsWith('@c.us')) {
      formattedPhone += '@c.us';
    }

    const isRegistered = await client.isRegisteredUser(formattedPhone);
    if (!isRegistered) {
      return res.status(400).json({ error: 'Number not registered on WhatsApp' });
    }

    const results = [];

    for (let i = 0; i < documentFiles.length; i++) {
      try {
        const media = MessageMedia.fromFilePath(documentFiles[i].path);
        const documentCaption = i === 0 ? (caption || '') : '';
        
        const result = await client.sendMessage(formattedPhone, media, {
          caption: documentCaption
        });

        results.push({
          file: documentFiles[i].originalname,
          messageId: result.id._serialized,
          success: true
        });

        fs.unlinkSync(documentFiles[i].path);

      } catch (error) {
        results.push({
          file: documentFiles[i].originalname,
          success: false,
          error: error.message
        });

        if (fs.existsSync(documentFiles[i].path)) {
          fs.unlinkSync(documentFiles[i].path);
        }
      }
    }

    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('Error sending multiple documents:', error);
    
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ 
      error: 'Error sending multiple documents',
      details: error.message 
    });
  }
});

app.post('/disconnect', async (req, res) => {
  try {
    await client.destroy();
    isClientReady = false;
    res.json({ message: 'Client disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({ error: 'Error disconnecting client' });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Limit: 100MB' });
    }
  }
  
  if (error.message && error.message.includes('Video format not supported')) {
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message && error.message.includes('Document format not supported')) {
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message && error.message.includes('Only image, video, and document files')) {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  try {
    await client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error shutting down:', error);
    process.exit(1);
  }
});