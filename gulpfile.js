// Перейти в дальнейшем на .mjs, библиотеки (imagemin) не работают на require
const { src, dest, watch, series, parallel } = require('gulp')
const sass = require('gulp-sass')(require('sass'))
const plumber = require('gulp-plumber')
const notify = require('gulp-notify')
const browserSync = require('browser-sync').create()
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const cssnano = require('cssnano')
const fileInclude = require('gulp-file-include')
const svgSprite = require('gulp-svg-sprite') // ← основной плагин для спрайта
const svgmin = require('gulp-svgmin')
const esbuild = require('gulp-esbuild') // ← оптимизация SVG
const imagemin = require('gulp-imagemin')
const del = require('del')

// Плагин для отлова ошибок
// const onError = (err) => {
//     notify.onError({
//         title: 'Gulp',
//         subtitle: 'Ошибка!',
//         message: 'Ошибка: <%= error.message %>',
//         sound: 'Basso',
//     })(err)
//     this.emit('end')
// }

function clean() {
    return del('dist')
}

// HTML с include
function html() {
    return src(['src/html/*.html', '!src/html/parts/**/*.html'])
        //.pipe(plumber({ errorHandler: onError }))
        .pipe(
            fileInclude({
                prefix: '@@',
                basepath: '@file',
            }),
        )
        .pipe(dest('dist'))
}

function styles() {
    return src('src/scss/styles.scss')
        //.pipe(plumber({ errorHandler: onError }))
        .pipe(sass({ outputStyle: 'expanded' }).on('error', sass.logError))
        .pipe(
            postcss([
                autoprefixer(),
                // cssnano() // раскомментировать только для продакшена
            ]),
        )
        .pipe(dest('dist/css'))
        .pipe(browserSync.stream())
}

// JavaScript (минификация)
function scripts() {
    return src('src/js/pages/*.js')
        //.pipe(plumber({ errorHandler: onError }))
        .pipe(
            esbuild({
                bundle: true,
                minify: false,
                target: ['es2020'],
                sourcemap: process.env.NODE_ENV !== 'production',
                format: 'iife',
                outdir: '.',
                entryNames: '[name].min',
                charset: 'utf8',
            }),
        )
        .pipe(dest('dist/js'))
}

// Копирование статических файлов
function assets() {
    return src(
        [
            'src/assets/fonts/**/*.{woff,woff2,ttf,eot,svg}',
            'src/assets/img/**/*.{jpg,jpeg,png,gif,svg,webp,ico}',
            'src/assets/favicon/**/*.*',
            'src/assets/videos/**/*',
        ],
        {
            base: 'src/assets',
            encoding: false,
        },
    )
        //.pipe(plumber({ errorHandler: onError }))
        .pipe(dest('dist/assets'))
}

// function images() {
//     return src('src/assets/img/**/*.{jpg,jpeg,png,gif,svg,webp,ico}')
//         //.pipe(plumber({ errorHandler: onError }))
//         .pipe(
//             imagemin([
//                 imagemin.mozjpeg({ quality: 75, progressive: true }),
//                 imagemin.optipng({ optimizationLevel: 5 }),
//                 imagemin.gifsicle({ interlaced: true }),
//                 imagemin.svgo({
//                     plugins: [{ removeViewBox: false }, { cleanupIDs: false }],
//                 }),
//             ]),
//         )
//         .pipe(dest('dist/assets/img'))
// }

// SVG-спрайт (режим symbol — самый удобный)
function icons() {
    return src('src/assets/icons/**/*.svg')
        //.pipe(plumber({ errorHandler: onError }))
        .pipe(svgmin()) // минимизируем каждый SVG
        .pipe(
            svgSprite({
                mode: {
                    symbol: {
                        sprite: 'sprite.svg',
                        prefix: '.icon-%s', // классы вида .icon-heart
                        dimensions: true, // добавляет --width, --height в CSS (удобно)
                        bust: false, // без кэш-бустера (можно включить true)
                        example: false,
                        dest: '.',
                    },
                },
                shape: {
                    id: {
                        separator: '-', // icon-heart-fill → #icon-heart-fill
                    },
                },
            }),
        )
        .pipe(dest('dist/assets/icons'))
        .pipe(browserSync.stream())
}

// Локальный сервер + слежение
function serve() {
    browserSync.init({
        server: 'dist',
        notify: false,
        open: true,
    })

    watch('src/scss/**/*.scss', styles)
    watch('src/html/**/*.html', html).on('change', browserSync.reload)
    watch('src/js/**/*.js', scripts).on('change', browserSync.reload)
    watch(['src/assets/fonts/**/*', 'src/assets/img/**/*', 'src/assets/favicon/**/*'], assets)
    //Понаблюдать за картинками, возможно нужно будет перезапуск добавить
    // watch('src/assets/img/**/*.{jpg,jpeg,png,gif,svg,webp,ico}', images)
    watch('src/assets/icons/**/*.svg', icons) // ← следим за иконками
}

exports.styles = styles
exports.scripts = scripts
exports.assets = assets
exports.icons = icons
exports.serve = serve
exports.clean = clean

exports.default = series(clean, parallel(html, styles, scripts, assets, icons), serve)

exports.build = series(parallel(html, styles, scripts, assets, icons))
