# ==============================================================================
# HARDENED PRODUCTION NGINX (NON-ROOT)
# ==============================================================================
FROM nginx:1.27-alpine

# Hapus default config bawaan
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Salin config yang sudah diamankan
COPY nginx.conf /etc/nginx/nginx.conf

# Salin source files
COPY src/ /usr/share/nginx/html/

# Buat direktori temp dan set permissions ke unprivileged user (nginx UID:GID 101:101)
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /tmp/nginx.pid \
    && chown -R nginx:nginx /tmp/nginx.pid

# Ganti user ke non-root
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
