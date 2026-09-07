#!/bin/bash

# Configuración de Git + Push a GitHub

# Tu usuario y correo
GITHUB_USER="Evere8"
GITHUB_EMAIL="evere843@gmail.com"

# Configurar Git globalmente
git config --global user.name "$GITHUB_USER"
git config --global user.email "$GITHUB_EMAIL"

echo "✅ Usuario y correo de Git configurados: $GITHUB_USER / $GITHUB_EMAIL"

# Agregar todos los cambios al staging
git add .

# Pedir mensaje de commit
read -p "Ingrese el mensaje de commit: " COMMIT_MSG

# Hacer commit
git commit -m "$COMMIT_MSG"

# Verificar si el remoto ya existe
REMOTE_URL=$(git remote get-url origin 2>/dev/null)

if [ -z "$REMOTE_URL" ]; then
    # Pedir URL del repo si no existe remoto
    read -p "Ingrese la URL HTTPS de tu repositorio GitHub: " REPO_URL
    git remote add origin "$REPO_URL"
    echo "✅ Remote origin agregado: $REPO_URL"
else
    echo "✅ Remote origin ya existe: $REMOTE_URL"
fi

# Empujar cambios a la rama main
git push -u origin main

echo "✅ Todos los cambios han sido empujados a GitHub."
