# Dockerfile mínimo para o middleware Bridge
FROM node:20-alpine

# Diretório da aplicação
WORKDIR /app

# Copia package.json e package-lock se houver
COPY package*.json ./

# Instala dependências em modo production
RUN npm ci --production

# Copia o resto do código
COPY . .

# Porta que o app vai expor
ENV PORT=3000
EXPOSE 3000

# Comando de start
CMD ["node", "index.js"]
