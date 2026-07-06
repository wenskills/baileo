FROM php:8.2-fpm-alpine

# openssl  = génération des clés JWT (lexik:jwt:generate-keypair)
# libpq-dev = headers + runtime lib PostgreSQL (libpq.so.5 pour pdo_pgsql)
# Ne PAS supprimer libpq-dev après compilation — libpq.so.5 serait perdu
RUN apk add --no-cache \
    openssl \
    libpq-dev \
    libzip-dev \
    zip unzip git \
    icu-dev oniguruma-dev \
    libpng-dev libjpeg-turbo-dev freetype-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo pdo_pgsql pgsql \
        zip intl mbstring gd opcache

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json ./

RUN composer install --no-scripts --no-autoloader --no-security-blocking

# Copier tout le projet (inclut bin/console, config/, src/, public/, etc.)
COPY . .

# Rendre bin/console exécutable + générer l'autoloader + créer les dossiers
RUN chmod +x bin/console && \
    composer dump-autoload --optimize && \
    mkdir -p var/cache var/log \
             config/jwt \
             public/uploads/campaigns \
             public/uploads/passport && \
    chmod -R 777 var/ public/uploads/ config/jwt/

EXPOSE 9000
CMD ["php-fpm"]
