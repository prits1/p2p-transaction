# Use Node.js official image as base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the entire project
COPY . .

# Expose the port that Next.js runs on
EXPOSE 3000

# Command to start the Next.js app
CMD ["npm", "run", "dev"]
