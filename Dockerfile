FROM node:22-alpine
WORKDIR /app
COPY index.html server.cjs package.json ./
USER node
EXPOSE 3000
CMD ["node","server.cjs"]
