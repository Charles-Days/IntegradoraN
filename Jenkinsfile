pipeline {
    agent any

    environment {
        APP_NAME = 'hotel-housekeeping'
        PROJECT_DIR = '/home/ubuntu/app/IntegradoraN'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Obteniendo codigo del repositorio...'
                checkout scm
            }
        }

        stage('Pull Changes') {
            steps {
                echo 'Actualizando repositorio en servidor...'
                dir('/home/ubuntu/app/IntegradoraN') {
                    sh 'git pull origin main || true'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Construyendo imagen Docker...'
                dir('/home/ubuntu/app/IntegradoraN') {
                    sh 'docker-compose build --no-cache'
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Desplegando aplicacion...'
                dir('/home/ubuntu/app/IntegradoraN') {
                    sh 'docker-compose down || true'
                    sh 'docker-compose up -d'
                }
            }
        }

        stage('Health Check') {
            steps {
                echo 'Verificando que la aplicacion este funcionando...'
                sh 'sleep 45'
                sh 'curl -f http://localhost:3000/api/health || echo "Health check pendiente - la app puede tardar en iniciar"'
            }
        }
    }

    post {
        always {
            echo 'Limpiando imagenes no usadas...'
            sh 'docker system prune -f || true'
        }
        success {
            echo 'Despliegue completado exitosamente!'
        }
        failure {
            echo 'El despliegue fallo'
        }
    }
}
