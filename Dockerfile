# Stage 1: Build the React application
FROM node:20-slim AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Copy the build output from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Install gettext for envsubst
RUN apk --no-cache add gettext

# Copy the nginx configuration template and startup script
COPY nginx/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY nginx/start-nginx.sh /usr/local/bin/start-nginx.sh

# Expose port 8080 - this is a default, Cloud Run will use the PORT env var
EXPOSE 8080

# Start Nginx using the startup script
CMD ["start-nginx.sh"]
