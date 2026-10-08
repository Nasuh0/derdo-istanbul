FROM node:22-alpine
WORKDIR /app
COPY index.html server.cjs package.json data.js app.js style.css ./
COPY assets ./assets
USER node
EXPOSE 3000
CMD ["node","server.cjs"]
