FROM nginx:latest

RUN apt-get update && apt-get install -y nano git curl nodejs npm apache2-utils

WORKDIR /

RUN git clone https://github.com/humlab/excel-translator-client

WORKDIR /excel-translator-client

RUN npm install

RUN npm run build

RUN rm -rf /var/lib/apt/lists/*

RUN mv dist/* /usr/share/nginx/html/

# Build arguments for HTTP Basic Auth
ARG HTTP_BASIC_AUTH_USER
ARG HTTP_BASIC_AUTH_PASSWORD

# Create an .htpasswd file using the build arguments
RUN htpasswd -bc /etc/nginx/.htpasswd $HTTP_BASIC_AUTH_USER $HTTP_BASIC_AUTH_PASSWORD

COPY default.conf /etc/nginx/conf.d/default.conf