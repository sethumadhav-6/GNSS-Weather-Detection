# GNSS Atmospheric Weather Detection - PHP Version

This is the WAMP/PHP conversion of the original first-phase HTML frontend.

## How To Run In WAMP

Copy the `gps_accuracy_php_app` folder into your WAMP `www` directory, for example:

```text
C:\wamp64\www\gps_accuracy_php_app
```

Then open:

```text
http://localhost/gps_accuracy_php_app/
```

Do not open the `templates` folder directly. That was why the previous page appeared unstyled.

## Files

- `index.php` - main frontend page
- `assets/styles.css` - original glass/gradient design
- `assets/app.js` - browser GPS and live dashboard logic
- `api/analyze.php` - PHP atmospheric analysis backend
- `api/health.php` - backend health check

## GPS Note

Browser GPS works on `localhost` and HTTPS. It may fail on a LAN IP address like `http://192.168.x.x/...` unless served over HTTPS. Browsers do not expose raw GNSS satellite measurements, so satellite strength values are modeled estimates.
