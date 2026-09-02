# ==============================================================================
# FAST & RELIABLE PRODUCTION NGINX (ALPINE)
# ==============================================================================
FROM nginx:1.27-alpine

# Bersihkan konfigurasi default lama
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Salin konfigurasi server
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin aset website Company Profile
COPY src/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
