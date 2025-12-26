# Guia de Implantação (Vercel) 🚀

Este projeto está pronto para ser implantado na **Vercel**, uma das melhores plataformas para hospedar aplicações React/Vite.

Siga os passos abaixo para colocar seu sistema no ar.

## 1. Preparação (Já Feita)
*   ✅ **Build Verificado**: O comando `npm run build` foi testado e está funcionando.
*   ✅ **Configuração Vercel**: O arquivo `vercel.json` foi criado para garantir que o roteamento funcione corretamente.
*   ✅ **Dependências**: Todas as bibliotecas necessárias estão listadas.

## 2. Subindo para o GitHub
Se você ainda não subiu o código para o GitHub, faça isso:
1.  Crie um novo repositório no GitHub.
2.  No terminal do VS Code, execute:
    ```bash
    git init
    git add .
    git commit -m "Deploy inicial"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
    git push -u origin main
    ```

## 3. Configurando na Vercel
1.  Acesse [vercel.com](https://vercel.com) e faça login (com sua conta GitHub).
2.  Clique em **"Add New..."** -> **"Project"**.
3.  Selecione o repositório do **Sistema DB** que você acabou de subir.
4.  **IMPORTANTE - Configure os Ajustes do Projeto:**

    *   **Root Directory (Diretório Raiz):**
        *   Como o projeto está dentro de uma pasta, clique em `Edit` ao lado de "Root Directory".
        *   Selecione a pasta `diario_de_bordo`.

    *   **Environment Variables (Variáveis de Ambiente):**
        *   Abra a seção "Environment Variables".
        *   Adicione as seguintes chaves (copie os valores do seu arquivo local `.env`):
            1.  `VITE_SUPABASE_URL`: (Sua URL do Supabase)
            2.  `VITE_SUPABASE_ANON_KEY`: (Sua chave Anon/Public do Supabase)
            3.  `GEMINI_API_KEY`: (Sua chave da Google AI Studio)

5.  Clique em **"Deploy"**.

## 4. Finalização
A Vercel vai iniciar o processo de build. Em cerca de 1 a 2 minutos, o site estará no ar! 🎉
Você receberá uma URL pública (ex: `seu-projeto.vercel.app`) para compartilhar com a equipe.

---
**Observação sobre Segurança:**
Como este é um projeto Frontend (React), suas chaves de API (`GEMINI_API_KEY`) ficarão visíveis no código javascript gerado se alguém inspecionar. Para projetos internos, isso geralmente é aceitável, mas em produção de larga escala, recomenda-se criar um backend intermediário.
