FROM dxflrs/garage:v1.0.1@sha256:a5706cf1f3d7b349ac5133ec59ad8181b709270b75e5f2fa7b3e1a5c07d67137 AS garage

FROM alpine:3.24@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b

COPY --from=garage /garage /garage
COPY local-development/docker/garage/entrypoint.sh /usr/local/bin/garage-entrypoint.sh

ENTRYPOINT ["/bin/sh", "/usr/local/bin/garage-entrypoint.sh"]
