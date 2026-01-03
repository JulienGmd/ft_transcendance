# ft_transcendence

The use of libraries or tools that provide an immediate and complete solution for an entire feature or a module is prohibited.

## Minimal technical requirement

- Backend:
  - PHP without frameworks or Framework module.
  - If using a database, follow the constraints of the Database module.
- Frontend:
  - Typescript or FrontEnd module.
  - SPA with Back and Forward buttons of the browser.
  - Compatible Mozilla Firefox stable.
  - No unhandled errors or warnings when browsing the website.
- Must use Docker. Everything must be launched with a single command.

TODO:
Several container technologies exist: Docker, containerd, podman,
etc. On the computers of your campus, you may access the container
software in rootless mode for security reasons. This could lead to
the following extra constraints:
• Your runtime needs to be located in /goinfre or /sgoinfre.
• You are not able to use “bind-mount volumes” between the host
and the container if non-root UIDs are used in the container.
Depending on the current requirements of the subject (highlighted in
green above) and the local configuration in clusters, you may need to
adopt different strategies, such as: container solution in virtual
machine, rebuild your container after your changes, craft your own
image with root as unique UID.

## Game

- TODO Two players can play using the same keyboard.
- TODO(show the tournament tree at the beginning, and update it after each round) A tournament system should also be available. It must clearly display who is playing against whom and the order of the play.
  - When starting, each player enter their alias, which are reset when a new tournament begins or Standard User Management module.
  - The tournament system should handle the matchmaking, and announce the next match.
- All players/AI follows the same rules (same paddle speed).

## Security concerns

- Any password in database must be hashed using a strong hashing algorithm.
- TODO Protection against SQL injections/XSS attacks.
- HTTPS/wss connection for all aspects.
- Validation mechanisms for forms and any user input (if no backend, on the base page, else server side)
- Routes are protected.
- Any credentials, API keys, env variables etc., must be saved locally in a .env file and ignored by git.

## Modules

### Overview

100% = 7 major modules
🔷🔶 = Major (10 points)
🔹🔸 = Minor (5 points)

Total of selected:
base: 30 points
major: 8 * 10 = 80 points
minor: 5 * 5 = 25 points
total: 30 + 80 + 25 = 135 points

- Web
  - 🔷 Use a framework to build the backend.
  - 🔹 Use a framework or a toolkit to build the frontend.
  - 🔹 Use a database for the backend.
  - 🔶 Store the score of a tournament in the Blockchain.
- User Management
  - 🔷 Standard user management, authentication, users across tournaments.
  - 🔷 Implementing a remote authentication.
- Gameplay and user experience
  - 🔷 Remote players
  - 🔶 Multiplayer (more than 2 players in the same game).
  - 🔶 Add another game with user history and matchmaking.
  - 🔸 Game customization options.
  - 🔶 Live chat.
- AI-Algo
  - 🔶 Introduce an AI opponent.
  - 🔸 User and game stats dashboards
- Cybersecurity
  - 🔶 Implement WAF/ModSecurity with a hardened configuration and HashiCorp Vault for secrets management.
  - 🔸 GDPR compliance options with user anonymization, local data management, and Account Deletion.
  - 🔷 Implement Two-Factor Authentication (2FA) and JWT.
- Devops
  - 🔷 Infrastructure Setup for Log Management.
  - 🔹 Monitoring system.
  - 🔷 Designing the backend as microservices.
- Graphics
  - 🔶 Use advanced 3D techniques.
- Accessibility
  - 🔹 Support on all devices.
  - 🔹 Expanding browser compatibility.
  - 🔸 Supports multiple languages.
  - 🔸 Add accessibility features for visually impaired users.
  - 🔸 Server-Side Rendering (SSR) integration.
- Server-Side Pong
  - 🔷 Replace basic Pong with server-side Pong and implement an API.
  - 🔶 Enabling Pong gameplay via CLI against web users with API integration.

### Web

#### Major module: Use a framework to build the backend.

Use Fastify with Node.js.

#### Minor module: Use a framework or toolkit to build the front-end.

Use Tailwind and Typescript, and nothing else.

#### Minor module: Use a database for the backend -and more.

Use SQLite.

### User Management

#### Major module: Standard user management, authentication and users across tournaments.

- Secure subscribe.
- Secure log in.
- Users can set their username.
- Users can update their information.
- Users can upload an avatar, with a default if none is provided.
- TODO Users can add others as friends and view their online status.
- User profiles display stats, such as wins and losses.
- TODO(any logged in user can see others history?) Each user has a Match History including 1v1 games, dates, and relevant details, accessible to logged-in users.

Manage duplicate usernames/emails.

#### Major module: Implement remote authentication.

Implement Google Sign-in

- Integrate the authentication system, allowing users to securely sign in.
- Obtain the necessary credentials and permissions from the authority to enable secure login.
- Implement user-friendly login and authorization flows that adhere to best practices and security standards.
- Secure exchange of auth tokens and user info between the web application and the authentication provider.

### Gameplay and user experience

#### Major module: Remote players

Two players can play remotely.
Consider network issues, such as unexpected disconnections or lag.
You must offer the best user experience possible.

### Cybersecurity

#### Major module: Implement Two-Factor Authentication (2FA) and JWT.

- Implement 2FA as an additional layer of security for user accounts, requiring users to provide a secondary verification method, such as a one-time code, in addition to their password.
- TODO(il faut les 3?) Provide a user-friendly setup process for enabling 2FA, with options for SMS codes, authenticator apps, or email-based verification.
- Utilize JWT as a secure method for authentication, authorization and user session access.
- Ensure that JWT tokens are issued and validated securely to prevent unauthorized access to user accounts and sensitive data.

### Devops

#### Major module: Infrastructure Setup with ELK (Elasticsearch, Logstash, Kibana) for Log Management.

- TODO Deploy Elasticsearch to efficiently store and index log data, ensuring it is easily searchable and accessible.
- Configure Logstash to collect, process, and transform log data from various sources, sending it to Elasticsearch.
- TODO Set up Kibana for visualizing log data, creating dashboards, and generating insights from log events.
- TODO Define data retention and archiving policies to manage log data storage effectively.
- TODO Implement security measures to protect log data and access to the ELK stack components.

#### Minor module: Monitoring system.

- TODO Deploy Prometheus as the monitoring and alerting toolkit to collect metrics and monitor the health and performance of various system components.
- TODO Configure data exporters and integrations to capture metrics from different services, databases, and infrastructure components.
- TODO Create custom dashboards and visualizations using Grafana to provide real- time insights into system metrics and performance.
- TODO Set up alerting rules in Prometheus to proactively detect and respond to critical issues and anomalies.
- TODO Ensure proper data retention and storage strategies for historical metrics data.
- TODO Implement secure authentication and access control mechanisms for Grafana to protect sensitive monitoring data.

#### Major module: Designing the Backend as Microservices.

- Divide the backend into smaller, loosely-coupled microservices, each responsible for specific functions or features.
- Define clear boundaries and interfaces between microservices to enable independent development, deployment, and scaling.
- Implement communication mechanisms between microservices, such as RESTful APIs or message queues, to facilitate data exchange and coordination.
- Ensure that each microservice is responsible for a single, well-defined task or business capability, promoting maintainability and scalability.

### Accessibility

#### Minor module: Support on all devices.

- Ensure the website is responsive, adapting to different screen sizes and orientations, providing a consistent user experience on desktops, laptops, tablets, and smartphones.
- TODO(touch to play) Ensure that users can easily navigate and interact with the website using different input methods, such as touchscreens, keyboards, and mice, depending on the device they are using.

#### Minor module: Expanding Browser Compatibility.

- Extend browser support to include an additional web browser, ensuring that users can access and use the application seamlessly.
- Conduct thorough testing and optimization to ensure that the web application functions correctly and displays correctly in the newly supported browser.
- Address any compatibility issues or rendering discrepancies that may arise in the added web browser.
- Ensure a consistent user experience across all supported browsers, maintaining usability and functionality.

### Server-Side Pong

#### Major module: Replace Basic Pong with Server-Side Pong and Implementing an API.

- Develop server-side logic for the Pong game to handle gameplay, ball movement, scoring, and player interactions.
- Create an API that exposes the necessary resources and endpoints to interact with the Pong game, allowing partial usage of the game via the Command-Line Interface (CLI) and web interface.
- Design and implement the API endpoints to support game initialization, player controls, and game state updates.
- Ensure that the server-side Pong game is responsive, providing an engaging and enjoyable gaming experience.
- Integrate the server-side Pong game with the web application, allowing users to play the game directly on the website.
