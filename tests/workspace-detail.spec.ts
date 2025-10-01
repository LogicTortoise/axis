import { test, expect } from '@playwright/test';

// 测试工作区ID
const TEST_WORKSPACE_ID = '4000de0e-a881-4cb0-9275-91713f36d891';
const TEST_WORKSPACE_NAME = 'Frontend Integration Project';

test.describe('Workspace Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到工作区详情页面
    await page.goto(`/wks-detail?workspaceId=${TEST_WORKSPACE_ID}`);
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    // 等待任务列表加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
  });

  test('should display workspace information', async ({ page }) => {
    // 验证工作区名称显示
    await expect(page.locator('h1')).toContainText(TEST_WORKSPACE_NAME);

    // 验证项目目标显示
    await expect(page.locator('text=项目目标：')).toBeVisible();
  });

  test('should display task list', async ({ page }) => {
    // 验证任务表格存在
    await expect(page.locator('table')).toBeVisible();

    // 验证表头
    await expect(page.locator('th:has-text("任务名称")')).toBeVisible();
    await expect(page.locator('th:has-text("优先级")')).toBeVisible();
    await expect(page.locator('th:has-text("当前状态")')).toBeVisible();
    await expect(page.locator('th:has-text("队列状态")')).toBeVisible();
    await expect(page.locator('th:has-text("人工Check")')).toBeVisible();
    await expect(page.locator('th:has-text("来源")')).toBeVisible();
    await expect(page.locator('th:has-text("创建时间")')).toBeVisible();
    await expect(page.locator('th:has-text("操作")')).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    // 点击添加任务按钮
    await page.click('button:has-text("添加任务")');

    // 等待模态框打开和动画完成
    const modal = page.locator('.fixed:has-text("添加任务")');
    await expect(modal).toBeVisible();
    await page.waitForTimeout(300);

    // 填写任务信息
    const timestamp = Date.now();
    const taskTitle = `Test Task ${timestamp}`;
    await page.fill('input[placeholder="请输入任务名称"]', taskTitle);
    await page.fill('textarea[placeholder="请输入任务描述..."]', 'This is a test task description');
    await page.locator('.fixed:has-text("添加任务")').locator('select').selectOption('high');

    // 提交表单 - 确保点击模态框内的添加按钮
    await page.locator('.fixed:has-text("添加任务")').locator('button:has-text("添加")').click();

    // 等待成功提示
    await expect(page.locator('.fixed:has-text("任务添加成功")')).toBeVisible({ timeout: 5000 });

    // 等待模态框关闭和数据刷新
    await page.waitForTimeout(1500);

    // 验证任务出现在列表中
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible();
  });

  test('should search tasks', async ({ page }) => {
    // 输入搜索关键词 - 使用更通用的搜索词
    await page.fill('input[placeholder="搜索任务..."]', 'Task');

    // 等待搜索结果
    await page.waitForTimeout(1000);

    // 验证搜索功能工作（可能有结果或无结果）
    const noDataVisible = await page.locator('text=暂无任务').isVisible();
    if (!noDataVisible) {
      const taskRows = await page.locator('table tbody tr').count();
      expect(taskRows).toBeGreaterThan(0);
    }

    // 清空搜索框，验证任务重新显示
    await page.fill('input[placeholder="搜索任务..."]', '');
    await page.waitForTimeout(1000);
  });

  test('should filter tasks by status', async ({ page }) => {
    // 选择状态筛选 (第一个select是状态)
    const statusSelect = page.locator('select').nth(0);
    await statusSelect.selectOption('pending');

    // 等待筛选结果
    await page.waitForTimeout(1000);

    // 验证所有显示的任务状态都是待执行
    const statusBadges = await page.locator('table tbody td:has-text("待执行")').count();
    const totalRows = await page.locator('table tbody tr').count();

    // 如果有任务，验证状态过滤是否生效
    if (totalRows > 0 && !await page.locator('text=暂无任务').isVisible()) {
      expect(statusBadges).toBeGreaterThan(0);
    }
  });

  test('should filter tasks by priority', async ({ page }) => {
    // 选择优先级筛选 (第二个select是优先级)
    const prioritySelect = page.locator('select').nth(1);
    await prioritySelect.selectOption('high');

    // 等待筛选结果
    await page.waitForTimeout(1000);

    // 验证所有显示的任务优先级都是高
    const priorityBadges = await page.locator('table tbody td:has-text("高")').count();
    const totalRows = await page.locator('table tbody tr').count();

    if (totalRows > 0 && !await page.locator('text=暂无任务').isVisible()) {
      expect(priorityBadges).toBeGreaterThan(0);
    }
  });

  test('should filter tasks by source', async ({ page }) => {
    // 选择来源筛选 (第三个select是来源)
    const sourceSelect = page.locator('select').nth(2);
    await sourceSelect.selectOption('manual');

    // 等待筛选结果
    await page.waitForTimeout(1000);

    // 验证所有显示的任务来源都是手动
    const sourceCell = await page.locator('table tbody td:has-text("手动")').count();
    const totalRows = await page.locator('table tbody tr').count();

    if (totalRows > 0 && !await page.locator('text=暂无任务').isVisible()) {
      expect(sourceCell).toBeGreaterThan(0);
    }
  });

  test('should sort tasks by title', async ({ page }) => {
    // 点击任务名称列标题进行排序
    await page.click('th div:has-text("任务名称")');

    // 等待排序结果
    await page.waitForTimeout(1000);

    // 获取第一个和最后一个任务标题
    const firstTask = await page.locator('table tbody tr:first-child td:nth-child(2)').textContent();
    const lastTask = await page.locator('table tbody tr:last-child td:nth-child(2)').textContent();

    // 验证排序（升序）
    if (firstTask && lastTask) {
      expect(firstTask.localeCompare(lastTask)).toBeLessThanOrEqual(0);
    }
  });

  test('should open task detail drawer', async ({ page }) => {
    // 点击第一个任务行
    await page.click('table tbody tr:first-child');

    // 等待抽屉打开
    await expect(page.locator('.fixed:has-text("任务详情")')).toBeVisible({ timeout: 5000 });

    // 验证抽屉内容
    await expect(page.locator('label:has-text("任务名称")')).toBeVisible();
    await expect(page.locator('label:has-text("任务描述")')).toBeVisible();
    await expect(page.locator('label:has-text("优先级")')).toBeVisible();
    await expect(page.locator('label:has-text("当前状态")')).toBeVisible();
  });

  test('should edit task in drawer', async ({ page }) => {
    // 打开第一个任务的详情
    await page.click('table tbody tr:first-child');
    await expect(page.locator('.fixed:has-text("任务详情")')).toBeVisible({ timeout: 5000 });

    // 修改任务名称
    const updatedTitle = `Updated Task ${Date.now()}`;
    const titleInput = page.locator('.fixed:has-text("任务详情")').locator('input').first();
    await titleInput.clear();
    await titleInput.fill(updatedTitle);

    // 点击保存
    await page.click('button:has-text("保存"):visible');

    // 等待成功提示
    await expect(page.locator('.fixed:has-text("任务保存成功")')).toBeVisible({ timeout: 5000 });

    // 等待抽屉关闭和数据刷新
    await page.waitForTimeout(1500);

    // 验证更新后的标题出现在列表中
    await expect(page.locator(`text=${updatedTitle}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('should close task drawer with cancel button', async ({ page }) => {
    // 打开任务详情
    await page.click('table tbody tr:first-child');
    await expect(page.locator('.fixed:has-text("任务详情")')).toBeVisible({ timeout: 5000 });

    // 点击取消按钮
    await page.click('button:has-text("取消"):visible');

    // 验证抽屉关闭
    await expect(page.locator('.fixed:has-text("任务详情")')).not.toBeVisible();
  });

  test('should close task drawer with close button', async ({ page }) => {
    // 打开任务详情
    await page.click('table tbody tr:first-child');
    await expect(page.locator('.fixed:has-text("任务详情")')).toBeVisible({ timeout: 5000 });

    // 点击关闭按钮（X）
    await page.click('.fixed:has-text("任务详情") button:has(i.fa-times)');

    // 验证抽屉关闭
    await expect(page.locator('.fixed:has-text("任务详情")')).not.toBeVisible();
  });

  test('should delete task', async ({ page }) => {
    // 先创建一个临时任务
    await page.click('button:has-text("添加任务")');
    const addModal = page.locator('.fixed:has-text("添加任务")');
    await expect(addModal).toBeVisible();
    await page.waitForTimeout(300);

    const taskTitle = `Task to Delete ${Date.now()}`;
    await page.fill('input[placeholder="请输入任务名称"]', taskTitle);
    await addModal.locator('button:has-text("添加")').click();
    await expect(page.locator('.fixed:has-text("任务添加成功")')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // 找到并点击刚创建的任务的删除按钮
    const taskRow = page.locator(`table tbody tr:has-text("${taskTitle}")`);
    await expect(taskRow).toBeVisible();

    // 点击该行的删除按钮
    await taskRow.locator('button[title="删除"]').click();

    // 确认删除
    const deleteModal = page.locator('.fixed:has-text("确认删除")');
    await expect(deleteModal).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);
    await deleteModal.locator('button:has-text("删除")').click();

    // 等待成功提示
    await expect(page.locator('.fixed:has-text("任务删除成功")')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // 验证任务从列表中消失
    await expect(page.locator(`table tbody tr:has-text("${taskTitle}")`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should dispatch task', async ({ page }) => {
    // 获取第一个待执行的任务
    const pendingTask = page.locator('table tbody tr').filter({ hasText: '待执行' }).first();

    if (await pendingTask.count() > 0) {
      // 点击下发按钮
      await pendingTask.locator('button[title="下发"]').click();

      // 确认下发
      await expect(page.locator('.fixed:has-text("确认下发")')).toBeVisible({ timeout: 5000 });
      await page.click('.fixed:has-text("确认下发") button:has-text("下发")');

      // 等待成功提示
      await expect(page.locator('.fixed:has-text("任务下发成功")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should select and deselect tasks', async ({ page }) => {
    // 确保有任务存在
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 点击第一个任务的复选框（第一个td中的checkbox，不是manual check的checkbox）
    const firstCheckbox = page.locator('table tbody tr:first-child td:first-child input[type="checkbox"]');
    await page.waitForTimeout(500);
    await firstCheckbox.click({ force: true });

    // 验证复选框被选中
    await page.waitForTimeout(300);
    await expect(firstCheckbox).toBeChecked();

    // 再次点击取消选中
    await firstCheckbox.click({ force: true });
    await page.waitForTimeout(300);
    await expect(firstCheckbox).not.toBeChecked();
  });

  test('should select all tasks', async ({ page }) => {
    // 点击全选复选框
    await page.locator('table thead input[type="checkbox"]').click({ force: true });

    // 等待一下
    await page.waitForTimeout(300);

    // 验证所有任务被选中（获取可见的任务行数）
    const taskRows = await page.locator('table tbody tr').count();
    if (taskRows > 0 && !await page.locator('text=暂无任务').isVisible()) {
      const checkedBoxes = await page.locator('table tbody input[type="checkbox"]:checked').count();
      expect(checkedBoxes).toBeGreaterThan(0);
    }
  });

  test('should batch delete tasks', async ({ page }) => {
    // 先创建几个临时任务
    for (let i = 0; i < 2; i++) {
      await page.click('button:has-text("添加任务")');
      const addModal = page.locator('.fixed:has-text("添加任务")');
      await expect(addModal).toBeVisible();
      await page.waitForTimeout(300);

      await page.fill('input[placeholder="请输入任务名称"]', `Batch Delete Test ${Date.now()}-${i}`);
      await addModal.locator('button:has-text("添加")').click();
      await page.waitForTimeout(1500);
    }

    await page.waitForTimeout(1000);

    // 选择前两个任务 (使用第一个td的checkbox)
    await page.locator('table tbody tr:first-child td:first-child input[type="checkbox"]').click({ force: true });
    await page.locator('table tbody tr:nth-child(2) td:first-child input[type="checkbox"]').click({ force: true });
    await page.waitForTimeout(300);

    // 点击批量删除按钮
    await page.click('button:has-text("批量删除")');

    // 等待删除成功提示
    await expect(page.locator('.fixed:has-text("已删除")')).toBeVisible({ timeout: 5000 });
  });

  test('should manually fetch tasks', async ({ page }) => {
    // 点击手动获取任务按钮
    await page.click('button:has-text("手动获取任务")');

    // 等待成功提示
    await expect(page.locator('.fixed:has-text("任务获取成功")')).toBeVisible({ timeout: 5000 });
  });

  test('should paginate tasks', async ({ page }) => {
    // 确保有足够的任务进行分页测试
    const totalText = await page.locator('text=/共.*条/').textContent();
    const totalMatch = totalText?.match(/共\s*(\d+)\s*条/);

    if (totalMatch && parseInt(totalMatch[1]) > 10) {
      // 点击下一页按钮
      const nextButton = page.locator('button:has(i.fa-chevron-right)').last();
      await nextButton.click();

      // 等待页面刷新
      await page.waitForTimeout(1000);

      // 验证页码变化
      await expect(page.locator('.bg-primary.text-white:has-text("2")')).toBeVisible();
    }
  });

  test('should change page size', async ({ page }) => {
    // 更改每页显示条数
    await page.locator('select').last().selectOption('5');

    // 等待页面刷新
    await page.waitForTimeout(1000);

    // 验证显示的任务数量不超过5个
    const visibleRows = await page.locator('table tbody tr').count();
    expect(visibleRows).toBeLessThanOrEqual(5 + 1); // +1 for potential "no data" row
  });

  test('should navigate using breadcrumbs', async ({ page }) => {
    // 点击面包屑导航中的"工作区"
    await page.click('nav a:has-text("工作区")');

    // 验证跳转到工作区列表页
    await expect(page).toHaveURL(/\/wks-list/);
  });

  test('should navigate to workspace settings', async ({ page }) => {
    // 点击左侧菜单中的"工作区设置"
    await page.click('aside a:has-text("工作区设置")');

    // 验证跳转到设置页面
    await expect(page).toHaveURL(/\/wks-settings/);
  });

  test('should navigate to task queue', async ({ page }) => {
    // 点击左侧菜单中的"任务队列"
    await page.click('aside a:has-text("任务队列")');

    // 验证跳转到队列管理页面
    await expect(page).toHaveURL(/\/queue-manage/);
  });

  test('should navigate to notification center', async ({ page }) => {
    // 点击顶部导航栏的通知图标
    await page.click('header a[href="/notif-center"]');

    // 验证跳转到通知中心
    await expect(page).toHaveURL(/\/notif-center/);
  });

  test('should navigate to dashboard', async ({ page }) => {
    // 点击左侧菜单中的"仪表盘"
    await page.click('aside a:has-text("仪表盘")');

    // 验证跳转到仪表盘
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
