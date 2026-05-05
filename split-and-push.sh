#!/bin/bash
# split-and-push.sh
# Splits the in-progress Person-2 work across the proper feature branches
# and pushes each to origin. Run this from the repo root in your Mac terminal:
#
#   cd ~/Desktop/WEB/web101-web102-group-1
#   bash split-and-push.sh
#
# Prereqs:
#   - Working tree currently has uncommitted changes (the integration work).
#   - You're on feature/frontend-setup (the script will switch to it).
#   - You can push to origin (GitHub credentials cached).
#
# This will:
#   1. Stash all current uncommitted changes.
#   2. Create + commit + push:
#        feature/dashboard-integration       <- Person 4
#        feature/task-management-frontend    <- Person 3
#        feature/users-reports-deployment    <- Person 5
#   3. Return you to feature/frontend-setup with a clean working tree.
#
# Each new commit is authored by you (TaTu). Your teammates can build
# on top of these branches with their own follow-up commits.

set -euo pipefail

# Sanity check
if [ ! -d task-manager ]; then
  echo "Error: run this from the repo root (the folder that contains task-manager/)"
  exit 1
fi

# Clear any orphaned git lock file
rm -f .git/index.lock

# Set git author (idempotent)
git config user.name  "TaTu"
git config user.email "02240369.cst@rub.edu.bt"

echo "==> Fetching origin"
git fetch --prune origin

echo "==> Switching to feature/frontend-setup"
git checkout feature/frontend-setup

echo "==> Stashing current changes"
git stash push -u -m "p2-integration-work" -- task-manager/

# -------- 1. feature/dashboard-integration (Person 4) --------
echo ""
echo "==> Creating feature/dashboard-integration off feature/frontend-setup"
git checkout -b feature/dashboard-integration

# Tracked (modified) files live in stash@{0}
git checkout stash@{0} -- \
  task-manager/package.json \
  task-manager/package-lock.json \
  task-manager/src/app/login/page.jsx \
  task-manager/src/app/signup/page.jsx \
  task-manager/src/app/dashboard/page.jsx \
  task-manager/src/components/layout/Sidebar.jsx \
  task-manager/src/components/layout/DashboardLayout.jsx

# Untracked (newly created) files live in stash@{0}^3 when stashed with -u
git checkout stash@{0}^3 -- \
  task-manager/src/lib/axios.js \
  task-manager/src/lib/apiPaths.js \
  task-manager/src/lib/getErrorMessage.js

git add -A
git commit -m "feat(integration): wire frontend to backend API

- axios instance with JWT request interceptor + 401 handling (src/lib/axios.js)
- centralized API path constants (src/lib/apiPaths.js)
- backend error-envelope helper (src/lib/getErrorMessage.js)
- login/signup forms call POST /auth/login and /auth/signup; token + user
  saved to localStorage; redirect to /dashboard
- dashboard fetches GET /tasks and derives stats, doughnut + bar chart data,
  and upcoming tasks from real data
- Sidebar reads user from localStorage and wires the Logout button
- DashboardLayout adds a client-side route guard that redirects to /login
  when no token is present

Drafted by Person 2 as handoff to Person 4."

echo "==> Pushing feature/dashboard-integration"
git push -u origin feature/dashboard-integration

# -------- 2. feature/task-management-frontend (Person 3) --------
echo ""
echo "==> Creating feature/task-management-frontend off feature/dashboard-integration"
git checkout -b feature/task-management-frontend

git checkout stash@{0} -- \
  task-manager/src/app/tasks/page.jsx \
  task-manager/src/app/create-task/page.jsx

git add -A
git commit -m "feat(tasks): wire tasks and create-task pages to backend API

- tasks page fetches GET /tasks; filter tabs operate on live data;
  Edit opens a modal that calls PUT /tasks/:id;
  Delete (with confirm) calls DELETE /tasks/:id
- create-task page calls POST /tasks then redirects to /tasks

Branches off feature/dashboard-integration so axios + apiPaths are present.

Drafted by Person 2 as handoff to Person 3."

echo "==> Pushing feature/task-management-frontend"
git push -u origin feature/task-management-frontend

# -------- 3. feature/users-reports-deployment (Person 5) --------
echo ""
echo "==> Creating feature/users-reports-deployment off feature/dashboard-integration"
git checkout feature/dashboard-integration
git checkout -b feature/users-reports-deployment

git checkout stash@{0} -- task-manager/src/app/team/page.jsx

git add -A
git commit -m "feat(team): wire team page to GET /users API

- team page fetches GET /users (admin-only) and renders member cards
- shows backend error message when unauthorized so non-admins see why

Branches off feature/dashboard-integration so axios + apiPaths are present.

Drafted by Person 2 as handoff to Person 5."

echo "==> Pushing feature/users-reports-deployment"
git push -u origin feature/users-reports-deployment

# -------- Cleanup --------
echo ""
echo "==> Returning to feature/frontend-setup"
git checkout feature/frontend-setup

echo "==> Dropping the stash (work is now in the three feature branches)"
git stash drop || true

echo ""
echo "All done. Branches now on origin:"
git branch -a | grep "feature/" | sed 's/^/  /'

echo ""
echo "Recommended PR merge order to dev:"
echo "  1. feature/frontend-setup           (Person 2 - static UI)"
echo "  2. feature/dashboard-integration    (Person 4 - axios, lib, login/signup, dashboard)"
echo "  3. feature/task-management-frontend (Person 3 - tasks, create-task wiring)"
echo "  4. feature/users-reports-deployment (Person 5 - team page wiring)"
