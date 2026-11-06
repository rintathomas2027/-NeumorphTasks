import os
import time
from playwright.sync_api import sync_playwright

output_dir = os.path.abspath("docs/images")
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    # Use installed Microsoft Edge
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    # 1. Dashboard Light Mode
    print("Navigating to http://localhost:8000...")
    page.goto("http://localhost:8000", wait_until="networkidle")
    time.sleep(1)
    light_path = os.path.join(output_dir, "01_dashboard_light.png")
    page.screenshot(path=light_path, full_page=False)
    print(f"Captured: {light_path}")

    # 2. Create Modal
    print("Opening Create Task modal...")
    page.click("#new-task-btn")
    time.sleep(0.5)
    # Fill in sample inputs to show it off
    page.fill("#task-title-input", "Deploy Kubernetes Cluster with Helm")
    page.fill("#task-desc-input", "Configure ingress controller, configure TLS secrets, and verify service connectivity.")
    page.select_option("#task-priority-select", "urgent")
    page.fill("#task-category-input", "DevOps")
    modal_path = os.path.join(output_dir, "02_create_task_modal.png")
    page.screenshot(path=modal_path, full_page=False)
    print(f"Captured: {modal_path}")

    # Close modal
    page.click("#modal-cancel-btn")
    time.sleep(0.5)

    # 3. Dashboard Dark Mode
    print("Toggling to Dark Mode...")
    page.click("#theme-toggle")
    time.sleep(0.8)
    dark_path = os.path.join(output_dir, "03_dashboard_dark.png")
    page.screenshot(path=dark_path, full_page=False)
    print(f"Captured: {dark_path}")

    # 4. Interactive Swagger API Docs
    print("Navigating to http://localhost:8000/docs...")
    page.goto("http://localhost:8000/docs", wait_until="networkidle")
    time.sleep(1)
    docs_path = os.path.join(output_dir, "04_swagger_api_docs.png")
    page.screenshot(path=docs_path, full_page=False)
    print(f"Captured: {docs_path}")

    browser.close()
    print("All screenshots successfully captured!")
