# UML Chat Designer: Comprehensive Example Library

This document provides detailed examples of UML diagrams for use with the UML Chat Designer. Each example includes:
- **Diagram Type**
- **Description**
- **Prompt** (copy and paste into the UML Chat Designer to generate the diagram)

---

## 1. IT-Related Sequence Diagram: User Login Flow

**Description:**  
This sequence diagram shows the complete process of a user logging into a web application, including all key system components: browser, server, database, logging, and session management. It covers both successful and failed login attempts, making it a great reference for authentication flows.

**Prompt:**
```plantuml
@startuml
!theme blueprint
title IT-Related Sequence Diagram: User Login Flow

actor User
participant "Web Browser" as Browser
participant "Web Server" as Server
participant "Database" as DB
participant "Logging Service" as Logger
participant "Session Manager" as Session

User -> Browser : Enter username and password
Browser -> Server : Send login request
Server -> Logger : Log login attempt
Server -> DB : Query user credentials
DB --> Server : Return user credentials
alt Credentials valid
    Server -> Session : Create user session
    Session --> Server : Return session token
    Server -> Logger : Log successful login
    Server -> Browser : Return success response with session token
    Browser -> User : Display dashboard
else Credentials invalid
    Server -> Logger : Log failed login
    Server -> Browser : Return error response
    Browser -> User : Display error message
@enduml
```

---

## 2. Non-IT Sequence Diagram: Restaurant Order Process

**Description:**  
This sequence diagram models the process of ordering food at a restaurant, from placing the order to payment and receipt. It clearly shows the interactions between customer, waiter, kitchen, and payment system.

**Prompt:**
```plantuml
@startuml
!theme blueprint
title Non-IT Sequence Diagram: Restaurant Order Process

actor Customer
participant "Waiter" as Waiter
participant "Kitchen" as Kitchen
participant "Payment System" as Payment

Customer -> Waiter : Place order
Waiter -> Kitchen : Submit order
Kitchen -> Waiter : Prepare and deliver food
Waiter -> Customer : Serve food
Customer -> Waiter : Request bill
Waiter -> Payment : Process payment
Payment --> Waiter : Payment confirmation
Waiter -> Customer : Provide receipt
@enduml
```

---

## 3. IT-Related Activity Diagram: Software Deployment Process

**Description:**  
This activity diagram outlines the main steps in a modern software deployment pipeline, including coding, testing, building, deployment, and monitoring. It demonstrates the iterative nature of fixing code and retesting until success.

**Prompt:**
```plantuml
@startuml
!theme blueprint
title IT-Related Activity Diagram: Software Deployment Process

start
:Write code;
:Commit changes to repository;
:Run automated tests;
if ("Tests pass?") then (Yes)
  :Build application;
  :Deploy to production;
  :Monitor application;
  stop
else (No)
  :Fix code;
  -[#black]-> :Run automated tests;
endif
@enduml
```

---

## 4. Non-IT Activity Diagram: Vacation Planning Process

**Description:**  
This activity diagram visualizes the process of planning a vacation, including destination selection, research, budgeting, booking, and packing. It highlights decision points and possible loops in the planning process.

**Prompt:**
```plantuml
@startuml
!theme blueprint
title Non-IT Activity Diagram: Vacation Planning Process

start
:Choose destination;
:Research travel options;
if ("Budget sufficient?") then (Yes)
  :Book tickets and accommodation;
  :Pack luggage;
  :Travel to destination;
  stop
else (No)
  :Adjust budget or destination;
  -[#black]-> :Research travel options;
endif
@enduml
```

---

## How to Use These Prompts

1. Open the **UML Chat Designer** in the extension.
2. Copy the desired prompt from this document.
3. Paste it into the chat input field.
4. The UML Chat Designer will generate the corresponding diagram.

Feel free to modify these prompts to fit your own scenarios!
