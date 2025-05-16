FROM node:24-slim AS react-build
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

# Install project dependencies
RUN npm install

COPY . ./

RUN npm run build --omit=dev

# Build complete

FROM nginx:latest

COPY --from=react-build /app/dist/ /www/html

# https://stackoverflow.com/questions/72748706/how-to-pass-environment-variable-to-nginx-conf-file-in-docker
COPY ./nginx.conf /etc/nginx/templates/nginx.conf.template
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

# COPY ./security-headers.conf /etc/nginx/includes/security-headers.conf
# COPY ./csp-header.conf /etc/nginx/includes/csp-header.conf

# Copied build to nginx image

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
