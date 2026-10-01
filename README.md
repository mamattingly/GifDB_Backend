# Personal GIF Host

A small React + Express application for hosting GIF files on infrastructure you control.

It provides:

- Drag-and-drop GIF uploads
- A searchable GIF library
- Direct HTTPS-ready GIF URLs
- Copy-link functionality
- Delete functionality
- Local persistent storage
- Production build served by Express

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The API runs on port 3001.

## Production build

```bash
npm install
npm run build
npm start
```

Then open:

```text
http://localhost:3001
```

## Storage

GIF files are stored in:

```text
data/gifs/
```

The library index is:

```text
data/gifs.json
```

Back up the `data` directory if you use local disk storage.

## Configuration

Optional environment variable:

```text
PORT=3001
MAX_FILE_SIZE=15728640
```

`MAX_FILE_SIZE` is in bytes and defaults to 15 MB.

## Deploying publicly

For a public HTTPS URL, deploy the application to a host that supports Node.js and persistent storage, or replace the local storage layer with object storage such as S3-compatible storage.

For a production deployment, add authentication before exposing the upload/delete API publicly. A simple approach is to put the app behind your hosting provider's authentication layer or add an application-level login.

If you use ephemeral hosting, do not rely on the local `data/` directory for permanent GIF storage; use persistent storage instead.

## Teams usage

The application generates direct URLs such as:

```text
https://your-domain.example/gifs/12345678-....gif
```

Use the site's own hosted URL when sharing content you are authorized to host. Whether Teams renders a particular image inline depends on your organization's Teams configuration, link handling, authentication requirements, and network policies.

This project does not attempt to bypass organizational network controls or security policies.
