FROM php:8.3-fpm

RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    zip \
    unzip

RUN docker-php-ext-install pdo pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip

RUN pecl install redis && docker-php-ext-enable redis

RUN pecl install pcov && docker-php-ext-enable pcov

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

RUN chown -R www-data:www-data /var/www