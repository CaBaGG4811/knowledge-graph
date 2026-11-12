FROM node:20-slim

WORKDIR /app

COPY . .
RUN npm install --prefix server --omit=dev

ENV PORT=7860
EXPOSE 7860

CMD ["node", "server/server.js"]
