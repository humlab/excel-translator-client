FROM nginx:stable

RUN apt-get update && apt-get install -y nano git curl nodejs npm apache2-utils

WORKDIR /

RUN git clone https://github.com/humlab/excel-translator-client

WORKDIR /excel-translator-client

RUN npm install

RUN npm run build

RUN mv /excel-translator-client/dist/* /usr/share/nginx/html/

RUN rm -rf /var/lib/apt/lists/*

# Build arguments for HTTP Basic Auth
ARG HTTP_BASIC_AUTH_USER
ARG HTTP_BASIC_AUTH_PASSWORD
ARG EXTERNAL_URL
ENV EXTERNAL_URL=$EXTERNAL_URL

# Create an .htpasswd file using the build arguments
RUN htpasswd -bc /etc/nginx/.htpasswd $HTTP_BASIC_AUTH_USER $HTTP_BASIC_AUTH_PASSWORD

COPY default.conf /etc/nginx/conf.d/default.conf
