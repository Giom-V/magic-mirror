#!/bin/sh

# Set the port to the value of the PORT environment variable, or 8080 if it's not set.
export PORT_TO_USE=${PORT:-8080}

# Substitute the placeholder with the actual port
envsubst '__PORT__' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx
exec nginx -g 'daemon off;'
