## Development

```
hugo server -D --disableFastRender
```

## Converting videos to WebM

`bin/towebm` wraps `ffmpeg` to convert an mp4 (or any ffmpeg-readable video) to
VP9 WebM, which is much smaller for screencasts.

```
./bin/towebm ./source.mp4 ./target.webm   # explicit target
./bin/towebm ./source.mp4                  # writes ./source.webm
```

It encodes with `-c:v libvpx-vp9 -crf 31 -b:v 0`, i.e. constant-quality mode:
CRF 31 drives the quality and the file size lands wherever it needs to (roughly
a third of the source for typical screencasts). Lower the CRF for higher quality
/ bigger files, raise it for smaller. Requires `ffmpeg` on your PATH.

## Hosting large files on Backblaze B2

```
b2 file upload ismaelcelis ./videos/file.mp4 2025/file.mp4
```

This will output a public URL for the uploaded file.

https://www.backblaze.com/docs/cloud-storage-command-line-interface?version=V4.0.2

Backblaze application key in my vault.
