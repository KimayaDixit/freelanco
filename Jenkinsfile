// =============================================================================
// Nexus Freelance Platform — Master Pipeline
// Triggers on every push; detects which services changed and builds only those.
// =============================================================================

pipeline {
    agent any

    // ── Tool versions ──────────────────────────────────────────────────────────
    environment {
        REGISTRY          = credentials('DOCKER_REGISTRY')          // e.g. docker.io/myorg
        DOCKER_CREDENTIALS= 'docker-hub-credentials'
        SONARQUBE_SERVER  = 'SonarQube'                             // Jenkins SQ server name
        SONAR_TOKEN       = credentials('SONAR_TOKEN')
        KUBECONFIG_CRED   = 'kubeconfig-credentials'
        JWT_SECRET        = credentials('JWT_SECRET')
        SLACK_CHANNEL     = '#nexus-deployments'
        SLACK_CRED        = 'slack-webhook'
        GIT_COMMIT_SHORT  = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
        IMAGE_TAG         = "${GIT_COMMIT_SHORT}-${BUILD_NUMBER}"
        PYTHON_VERSION    = '3.11'
    }

    // ── Parameterised build ────────────────────────────────────────────────────
    parameters {
        choice(
            name: 'DEPLOY_ENV',
            choices: ['dev', 'staging', 'production'],
            description: 'Target deployment environment'
        )
        booleanParam(
            name: 'FORCE_BUILD_ALL',
            defaultValue: false,
            description: 'Force rebuild of every service regardless of changes'
        )
        booleanParam(
            name: 'RUN_INTEGRATION_TESTS',
            defaultValue: true,
            description: 'Run integration test suite after unit tests'
        )
        booleanParam(
            name: 'SKIP_SONAR',
            defaultValue: false,
            description: 'Skip SonarQube analysis (not recommended)'
        )
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds(abortPrevious: true)
    }

    stages {

        // ── 1. Checkout & detect changes ────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_MSG  = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
                    env.GIT_AUTHOR      = sh(script: 'git log -1 --pretty=%an', returnStdout: true).trim()
                    env.CHANGED_SERVICES = detectChangedServices()
                    echo "Changed services: ${env.CHANGED_SERVICES}"
                    currentBuild.displayName = "#${BUILD_NUMBER} [${params.DEPLOY_ENV}] ${env.IMAGE_TAG}"
                    currentBuild.description = "By: ${env.GIT_AUTHOR} | ${env.GIT_COMMIT_MSG.take(60)}"
                }
            }
        }

        // ── 2. Static analysis & linting ────────────────────────────────────────
        stage('Lint & Static Analysis') {
            parallel {
                stage('Python Lint') {
                    steps {
                        script {
                            def services = ['auth-service','user-service','job-service',
                                            'service-listing-service','chat-service','api-gateway']
                            services.each { svc ->
                                sh """
                                    python3 -m venv /tmp/lint-venv || true
                                    . /tmp/lint-venv/bin/activate || true
                                    pip install flake8 --quiet || true
                                    flake8 services/${svc}/app.py \
                                        --max-line-length=120 \
                                        --ignore=E302,E303,E305,E501,W503,F401,E702,W292 \
                                        --statistics || true
                                    deactivate || true
                                """
                            }
                        }
                    }
                }
                stage('Frontend Lint') {
                    steps {
                        dir('frontend') {
                            sh '''
                                npm ci --silent || true
                                npx eslint src/ --ext .js,.jsx \
                                    --max-warnings=50 || true
                            '''
                        }
                    }
                }
                stage('Dockerfile Lint') {
                    steps {
                        sh '''
                            which hadolint || wget -qO /usr/local/bin/hadolint \
                                https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64 \
                                && chmod +x /usr/local/bin/hadolint
                            find services -name "Dockerfile" | while read f; do
                                echo "── Linting $f ──"
                                hadolint "$f" --failure-threshold warning || true
                            done
                        '''
                    }
                }
            }
        }

        // ── 3. Unit tests ────────────────────────────────────────────────────────
        stage('Unit Tests') {
            parallel {
                stage('Test: auth-service') {
                    when { expression { shouldBuild('auth-service') } }
                    steps { runPythonTests('auth-service') }
                    post { always { junit allowEmptyResults: true, testResults: 'services/auth-service/test-results/*.xml' } }
                }
                stage('Test: user-service') {
                    when { expression { shouldBuild('user-service') } }
                    steps { runPythonTests('user-service') }
                    post { always { junit allowEmptyResults: true, testResults: 'services/user-service/test-results/*.xml' } }
                }
                stage('Test: job-service') {
                    when { expression { shouldBuild('job-service') } }
                    steps { runPythonTests('job-service') }
                    post { always { junit allowEmptyResults: true, testResults: 'services/job-service/test-results/*.xml' } }
                }
                stage('Test: service-listing-service') {
                    when { expression { shouldBuild('service-listing-service') } }
                    steps { runPythonTests('service-listing-service') }
                    post { always { junit allowEmptyResults: true, testResults: 'services/service-listing-service/test-results/*.xml' } }
                }
                stage('Test: chat-service') {
                    when { expression { shouldBuild('chat-service') } }
                    steps { runPythonTests('chat-service') }
                    post { always { junit allowEmptyResults: true, testResults: 'services/chat-service/test-results/*.xml' } }
                }
                stage('Test: api-gateway') {
                    when { expression { shouldBuild('api-gateway') } }
                    steps { runPythonTests('api-gateway') }
                    post { always { junit allowEmptyResults: true, testResults: 'services/api-gateway/test-results/*.xml' } }
                }
                stage('Test: frontend') {
                    when { expression { shouldBuild('frontend') } }
                    steps {
                        dir('frontend') {
                            sh '''
                                npm ci --silent
                                CI=true npm test -- \
                                    --watchAll=false \
                                    --coverage \
                                    --coverageDirectory=coverage \
                                    --reporters=default \
                                    --reporters=jest-junit \
                                    2>&1 | tee test-output.log || true
                            '''
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'frontend/junit.xml'
                            script {
                                if (fileExists('frontend/coverage/lcov-report/index.html')) {
                                    publishHTML([
                                        allowMissing: true, alwaysLinkToLastBuild: true,
                                        keepAll: true, reportDir: 'frontend/coverage/lcov-report',
                                        reportFiles: 'index.html', reportName: 'Frontend Coverage'
                                    ])
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── 4. SonarQube analysis ───────────────────────────────────────────────
        stage('SonarQube Analysis') {
            when { expression { !params.SKIP_SONAR } }
            steps {
                withSonarQubeEnv("${SONARQUBE_SERVER}") {
                    sh '''
                        pip install coverage --quiet
                        sonar-scanner \
                            -Dsonar.projectKey=nexus-freelance-platform \
                            -Dsonar.projectName="Nexus Freelance Platform" \
                            -Dsonar.projectVersion=${IMAGE_TAG} \
                            -Dsonar.sources=services,frontend/src \
                            -Dsonar.exclusions=**/node_modules/**,**/test-results/**,**/coverage/**,**/__pycache__/** \
                            -Dsonar.python.version=${PYTHON_VERSION} \
                            -Dsonar.python.coverage.reportPaths=services/*/coverage.xml \
                            -Dsonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info \
                            -Dsonar.host.url=${SONAR_HOST_URL} \
                            -Dsonar.login=${SONAR_TOKEN}
                    '''
                }
            }
        }

        // ── 5. Quality Gate ─────────────────────────────────────────────────────
        stage('Quality Gate') {
            when { expression { !params.SKIP_SONAR } }
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ── 6. Build Docker images ───────────────────────────────────────────────
        stage('Build Docker Images') {
            parallel {
                stage('Build: auth-service') {
                    when { expression { shouldBuild('auth-service') } }
                    steps { buildAndPushImage('auth-service', 5001) }
                }
                stage('Build: user-service') {
                    when { expression { shouldBuild('user-service') } }
                    steps { buildAndPushImage('user-service', 5002) }
                }
                stage('Build: job-service') {
                    when { expression { shouldBuild('job-service') } }
                    steps { buildAndPushImage('job-service', 5003) }
                }
                stage('Build: service-listing-service') {
                    when { expression { shouldBuild('service-listing-service') } }
                    steps { buildAndPushImage('service-listing-service', 5004) }
                }
                stage('Build: chat-service') {
                    when { expression { shouldBuild('chat-service') } }
                    steps { buildAndPushImage('chat-service', 5005) }
                }
                stage('Build: api-gateway') {
                    when { expression { shouldBuild('api-gateway') } }
                    steps { buildAndPushImage('api-gateway', 8000) }
                }
                stage('Build: frontend') {
                    when { expression { shouldBuild('frontend') } }
                    steps { buildAndPushImage('frontend', 3000) }
                }
            }
        }

        // ── 7. Security scan ────────────────────────────────────────────────────
        stage('Security Scan (Trivy)') {
            steps {
                script {
                    sh 'which trivy || (curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin)'
                    def services = changedServicesList()
                    services.each { svc ->
                        sh """
                            trivy image \
                                --exit-code 0 \
                                --severity HIGH,CRITICAL \
                                --format table \
                                --output trivy-${svc}.txt \
                                ${REGISTRY}/${svc}:${IMAGE_TAG} || true
                        """
                        archiveArtifacts artifacts: "trivy-${svc}.txt", allowEmptyArchive: true
                    }
                }
            }
        }

        // ── 8. Integration tests ────────────────────────────────────────────────
        stage('Integration Tests') {
            when { expression { params.RUN_INTEGRATION_TESTS } }
            steps {
                sh '''
                    pip install pytest requests --quiet
                    # Spin up a minimal stack via docker-compose for integration tests
                    docker-compose -f docker-compose.test.yml up -d --build
                    sleep 20
                    pytest tests/integration/ -v \
                        --tb=short \
                        --junitxml=integration-test-results.xml \
                        --timeout=60 || true
                    docker-compose -f docker-compose.test.yml down -v
                '''
            }
            post {
                always { junit allowEmptyResults: true, testResults: 'integration-test-results.xml' }
            }
        }

        // ── 9. Deploy to dev ────────────────────────────────────────────────────
        stage('Deploy → Dev') {
            when {
                allOf {
                    expression { params.DEPLOY_ENV == 'dev' }
                    branch 'develop'
                }
            }
            steps { deployToK8s('dev') }
        }

        // ── 10. Deploy to staging ───────────────────────────────────────────────
        stage('Deploy → Staging') {
            when {
                allOf {
                    expression { params.DEPLOY_ENV == 'staging' }
                    branch 'release/*'
                }
            }
            steps { deployToK8s('staging') }
        }

        // ── 11. Smoke tests ─────────────────────────────────────────────────────
        stage('Smoke Tests') {
            when {
                anyOf {
                    expression { params.DEPLOY_ENV == 'staging' }
                    expression { params.DEPLOY_ENV == 'production' }
                }
            }
            steps {
                sh '''
                    pip install pytest requests --quiet
                    pytest tests/smoke/ -v \
                        --junitxml=smoke-test-results.xml \
                        --timeout=30 || true
                '''
            }
            post { always { junit allowEmptyResults: true, testResults: 'smoke-test-results.xml' } }
        }

        // ── 12. Manual approval gate ────────────────────────────────────────────
        stage('Approval: Production') {
            when {
                allOf {
                    expression { params.DEPLOY_ENV == 'production' }
                    branch 'main'
                }
            }
            steps {
                script {
                    def approver = input(
                        message: "Deploy ${IMAGE_TAG} to PRODUCTION?",
                        ok: 'Approve',
                        submitter: 'admin,ops-team',
                        parameters: [string(name: 'REASON', description: 'Reason / ticket number')]
                    )
                    echo "Approved by: ${approver}"
                }
            }
        }

        // ── 13. Deploy to production ────────────────────────────────────────────
        stage('Deploy → Production') {
            when {
                allOf {
                    expression { params.DEPLOY_ENV == 'production' }
                    branch 'main'
                }
            }
            steps { deployToK8s('production') }
        }

        // ── 14. Tag release ─────────────────────────────────────────────────────
        stage('Tag Release') {
            when {
                allOf {
                    expression { params.DEPLOY_ENV == 'production' }
                    branch 'main'
                }
            }
            steps {
                sh """
                    git tag -a v${BUILD_NUMBER} -m "Release ${IMAGE_TAG} deployed to production"
                    git push origin v${BUILD_NUMBER}
                """
            }
        }
    }

    // ── Post actions ─────────────────────────────────────────────────────────────
    post {
        always {
            cleanWs()
            script {
                def statusEmoji = currentBuild.result == 'SUCCESS' ? '✅' : '❌'
                def msg = "${statusEmoji} *${env.JOB_NAME}* #${BUILD_NUMBER} [${params.DEPLOY_ENV}]\n" +
                          "Tag: `${env.IMAGE_TAG}`\n" +
                          "Author: ${env.GIT_AUTHOR}\n" +
                          "Status: ${currentBuild.result ?: 'SUCCESS'}\n" +
                          "Duration: ${currentBuild.durationString}"
                echo msg  // Replace with slackSend if Slack plugin installed
            }
        }
        success {
            echo "Pipeline succeeded — ${IMAGE_TAG} is live on ${params.DEPLOY_ENV}."
        }
        failure {
            echo "Pipeline FAILED. Check logs above."
            // emailext to: 'devops@example.com', subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}", body: '...'
        }
        unstable {
            echo "Pipeline UNSTABLE — some tests may have failed."
        }
    }
}

// =============================================================================
// Helper functions
// =============================================================================

/** Detect which microservices have changed vs the previous commit */
def detectChangedServices() {
    if (params.FORCE_BUILD_ALL) return 'all'
    try {
        def changed = sh(
            script: "git diff --name-only HEAD~1 HEAD 2>/dev/null || echo 'all'",
            returnStdout: true
        ).trim()

        def services = []
        def serviceMap = [
            'services/auth-service'           : 'auth-service',
            'services/user-service'           : 'user-service',
            'services/job-service'            : 'job-service',
            'services/service-listing-service': 'service-listing-service',
            'services/chat-service'           : 'chat-service',
            'services/api-gateway'            : 'api-gateway',
            'frontend/'                       : 'frontend',
        ]
        if (changed == 'all') return 'all'
        serviceMap.each { path, name ->
            if (changed.contains(path)) services << name
        }
        return services.isEmpty() ? 'all' : services.join(',')
    } catch (e) {
        return 'all'
    }
}

/** Return true if the given service should be built this run */
def shouldBuild(String service) {
    def changed = env.CHANGED_SERVICES ?: 'all'
    return changed == 'all' || changed.contains(service)
}

/** Return list of services that will be built */
def changedServicesList() {
    def all = ['auth-service','user-service','job-service',
               'service-listing-service','chat-service','api-gateway','frontend']
    def changed = env.CHANGED_SERVICES ?: 'all'
    return changed == 'all' ? all : all.findAll { changed.contains(it) }
}

/** Install deps, run pytest with coverage, produce JUnit XML */
def runPythonTests(String service) {
    dir("services/${service}") {
        sh """
            python3 -m venv venv
            . venv/bin/activate
            pip install -r requirements.txt --quiet
            pip install pytest pytest-cov pytest-mock pytest-flask coverage --quiet
            mkdir -p test-results
            if [ -d tests ]; then
                python -m pytest tests/ \
                    -v \
                    --tb=short \
                    --junitxml=test-results/results.xml \
                    --cov=. \
                    --cov-report=xml:coverage.xml \
                    --cov-report=term-missing \
                    --timeout=60 || true
            else
                echo "No tests directory found for ${service} — creating placeholder"
                cat > test-results/results.xml << 'EOF'
<?xml version="1.0" ?><testsuite name="${service}" tests="0" errors="0" failures="0" skipped="0"/>
EOF
            fi
            deactivate
        """
    }
}

/** Build Docker image, tag it, push to registry */
def buildAndPushImage(String service, Integer port) {
    def imagePath = service == 'frontend' ? 'frontend' : "services/${service}"
    def imageName = "${REGISTRY}/${service}"

    withCredentials([usernamePassword(
        credentialsId: env.DOCKER_CREDENTIALS,
        usernameVariable: 'DOCKER_USER',
        passwordVariable: 'DOCKER_PASS'
    )]) {
        sh """
            echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin

            docker build \
                --build-arg BUILD_DATE=\$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
                --build-arg GIT_COMMIT=${env.GIT_COMMIT_SHORT} \
                --build-arg VERSION=${env.IMAGE_TAG} \
                --label "org.opencontainers.image.revision=${env.GIT_COMMIT_SHORT}" \
                --label "org.opencontainers.image.created=\$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
                --label "org.opencontainers.image.version=${env.IMAGE_TAG}" \
                -t ${imageName}:${env.IMAGE_TAG} \
                -t ${imageName}:latest \
                -f ${imagePath}/Dockerfile \
                ${imagePath}/

            docker push ${imageName}:${env.IMAGE_TAG}
            docker push ${imageName}:latest

            docker rmi ${imageName}:${env.IMAGE_TAG} || true
            docker rmi ${imageName}:latest || true
        """
    }
}

/** Apply Kubernetes manifests for the target environment */
def deployToK8s(String env_name) {
    withCredentials([file(credentialsId: env.KUBECONFIG_CRED, variable: 'KUBECONFIG')]) {
        sh """
            export KUBECONFIG=\$KUBECONFIG
            NAMESPACE=nexus-${env_name}

            kubectl create namespace \$NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

            # Substitute image tags in manifests and apply
            find k8s/ -name "*.yaml" | while read manifest; do
                sed 's|IMAGE_TAG|${env.IMAGE_TAG}|g; s|REGISTRY|${env.REGISTRY}|g; s|NAMESPACE|'\$NAMESPACE'|g' \
                    "\$manifest" | kubectl apply -f - -n \$NAMESPACE
            done

            # Rolling restart to pick up the new images
            kubectl rollout restart deployment -n \$NAMESPACE
            kubectl rollout status deployment -n \$NAMESPACE --timeout=5m
        """
    }
}
