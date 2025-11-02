# CroChrome

A React app for resizing images to Chrome Web Store asset requirements. Quickly resize screenshots and promo tiles to the exact dimensions required for Chrome Web Store listings.

## Features

- Upload multiple images (JPEG/PNG)
- Resize to Chrome Web Store asset sizes:
  - **Screenshots**: 1280x800, 640x400
  - **Small Promo Tile**: 440x280
  - **Marquee Promo Tile**: 1400x560
- Batch resize multiple images at once
- Preview original vs resized images side-by-side
- Download individual or all resized images
- Modern dark theme UI with Ant Design components
- Drag and drop image upload support

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Deployment

The app is configured for GitHub Pages deployment:

```bash
npm run deploy
```

Live site: [https://maskmanlucifer.github.io/crochrome](https://maskmanlucifer.github.io/crochrome)

## Usage

1. Select an asset type (Screenshots, Small Promo Tile, or Marquee Promo Tile)
2. Choose the desired dimensions
3. Upload one or more images by clicking "Upload New" or dragging and dropping
4. Click "Resize All Images" to process all uploaded images
5. Preview the original vs resized images in the comparison view
6. Download individual images or click "Download All" to save all resized images

## Technologies

- React 18
- Ant Design 5
- react-image-crop (for future crop functionality)

## License

MIT
