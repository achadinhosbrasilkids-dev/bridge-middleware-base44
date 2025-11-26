# Dockerfile mínimo para o middleware Bridge
FROM node:20-alpine

# Diretório da aplicação
WORKDIR /app

# Copia package.json e package-lock.json (se existir)
COPY package*.json ./

# Instala dependências em modo produção
RUN npm install --production

# Copia o resto do código
COPY . .

# Porta usada pelo app
ENV PORT=3000
EXPOSE 3000

# Comando de start
CMD ["node", "index.js"]
