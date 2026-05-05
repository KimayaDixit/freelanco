# =============================================================================
# Custom Jenkins image for the Nexus Freelance Platform
# Includes: Docker CLI, kubectl, Python, Node.js, SonarScanner, Trivy
# =============================================================================
FROM jenkins/jenkins:2.504.1-lts-jdk21

USER root

# ── System dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    unzip \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# ── Docker CLI (for docker-in-docker / docker socket mount) ───────────────────
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
       https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js 20 LTS ────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── kubectl ───────────────────────────────────────────────────────────────────
RUN KUBECTL_VERSION=$(curl -sL https://dl.k8s.io/release/stable.txt) \
    && curl -fsSL "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
       -o /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl

# ── Sonar Scanner ─────────────────────────────────────────────────────────────
ENV SONAR_SCANNER_VERSION=5.0.1.3006
RUN wget -q \
    "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux.zip" \
    -O /tmp/sonar-scanner.zip \
    && unzip -q /tmp/sonar-scanner.zip -d /opt/ \
    && ln -s /opt/sonar-scanner-${SONAR_SCANNER_VERSION}-linux/bin/sonar-scanner /usr/local/bin/sonar-scanner \
    && rm /tmp/sonar-scanner.zip

# ── Hadolint (Dockerfile linter) ──────────────────────────────────────────────
RUN wget -qO /usr/local/bin/hadolint \
    https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64 \
    && chmod +x /usr/local/bin/hadolint

# ── Trivy (container vulnerability scanner) ───────────────────────────────────
RUN wget -qO- https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
    | sh -s -- -b /usr/local/bin

# ── Python tools ──────────────────────────────────────────────────────────────
RUN pip3 install --no-cache-dir --break-system-packages \
    flake8 \
    pylint \
    pytest \
    pytest-cov \
    pytest-mock \
    pytest-flask \
    pytest-timeout \
    coverage \
    requests \
    bandit

# ── Add jenkins user to docker group ──────────────────────────────────────────
RUN groupadd -f docker && usermod -aG docker jenkins

# ── Pre-install Jenkins plugins ───────────────────────────────────────────────
USER jenkins
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt \
    --verbose 2>&1 | tail -20

# ── JVM tuning ────────────────────────────────────────────────────────────────
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false \
               -Dhudson.model.DirectoryBrowserSupport.CSP= \
               -Xmx2g -Xms512m"
ENV JENKINS_OPTS="--httpPort=8080"

ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/ref/casc.yaml
COPY casc.yaml /usr/share/jenkins/ref/casc.yaml

EXPOSE 8080 50000
