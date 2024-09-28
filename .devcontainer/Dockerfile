FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    software-properties-common \
    npm \
    curl

RUN npm install npm@latest -g && \
    npm install n -g && \
    npm install -g @angular/cli@17

# Install Go
RUN curl -OL https://golang.org/dl/go1.23.0.linux-arm64.tar.gz && \
    tar -C /usr/local -xzf go1.23.0.linux-arm64.tar.gz && \
    rm go1.23.0.linux-arm64.tar.gz

# Set Go environment variables
ENV PATH="/usr/local/go/bin:${PATH}"