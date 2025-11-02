# CroChrome

A simple React app for cropping and resizing images to Chrome extension image requirement sizes, with basic editing features (arrows and text).

## Features

- Upload and crop images
- Resize to Chrome extension standard sizes (16x16, 19x19, 32x32, 38x38, 48x48, 128x128, 192x192)
- Add arrows to images
- Add text annotations with customizable color and size
- Download processed images
- Dark theme UI with Ant Design components

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Usage

1. Click "Upload Image" to select an image file
2. Crop the image using the crop tool (square crop for icons)
3. Click "Apply Crop" to proceed
4. Use "Arrow" button to draw arrows on the image
5. Use "Text" button to add text annotations
6. Select a Chrome extension size from the dropdown
7. Click "Resize" to resize the image
8. Click "Download" to save the final image
