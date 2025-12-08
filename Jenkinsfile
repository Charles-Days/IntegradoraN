pipeline {
    agent any

    environment {
        APP_NAME = 'hotel-housekeeping'
        DOCKER_IMAGE = "${APP_NAME}:${BUILD_NUMBER}"
        DOCKER_REGISTRY = credentials('docker-registry-url')
        NEXTAUTH_SECRET = credentials('nextauth-secret')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                sh 'npm ci'
            }
        }

        stage('Generate Prisma Client') {
            steps {
                echo 'Generating Prisma client...'
                sh 'npx prisma generate'
            }
        }

        stage('Lint') {
            steps {
                echo 'Running linter...'
                sh 'npm run lint || true'
            }
        }

        stage('Build') {
            steps {
                echo 'Building the application...'
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh "docker build -t ${DOCKER_IMAGE} ."
                sh "docker tag ${DOCKER_IMAGE} ${APP_NAME}:latest"
            }
        }

        stage('Push to Registry') {
            when {
                branch 'main'
            }
            steps {
                echo 'Pushing to Docker registry...'
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin $DOCKER_REGISTRY
                        docker tag ${DOCKER_IMAGE} ${DOCKER_REGISTRY}/${DOCKER_IMAGE}
                        docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}
                        docker tag ${APP_NAME}:latest ${DOCKER_REGISTRY}/${APP_NAME}:latest
                        docker push ${DOCKER_REGISTRY}/${APP_NAME}:latest
                    '''
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                echo 'Deploying to staging environment...'
                sh '''
                    docker-compose down || true
                    docker-compose up -d
                '''
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to production environment...'
                input message: 'Deploy to production?', ok: 'Deploy'
                sh '''
                    docker-compose -f docker-compose.yml down || true
                    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} docker-compose -f docker-compose.yml up -d
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo 'Performing health check...'
                sh '''
                    sleep 30
                    curl -f http://localhost:3000/api/health || exit 1
                '''
            }
        }
    }

    post {
        always {
            echo 'Cleaning up...'
            sh 'docker system prune -f || true'
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
            // Uncomment to enable notifications
            // slackSend(color: 'good', message: "Build ${env.BUILD_NUMBER} succeeded for ${env.JOB_NAME}")
        }
        failure {
            echo 'Pipeline failed!'
            // Uncomment to enable notifications
            // slackSend(color: 'danger', message: "Build ${env.BUILD_NUMBER} failed for ${env.JOB_NAME}")
        }
    }
}
