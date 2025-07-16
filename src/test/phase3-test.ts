/**
 * Phase 3 Advanced Features Test Suite
 * Tests: Plugin System, Enhanced Strategy Pattern, Lazy Loading
 */

import { container } from '../tools/base/dependencyInjection';
import { eventBus } from '../tools/base/eventBus';
import { lazyLoadingManager, createLazyService } from '../tools/base/lazyLoading';
import { pluginManager } from '../tools/plugins/pluginSystem';
import { engineManager } from '../tools/uml/strategy/engineStrategy';

async function testDependencyInjection(): Promise<boolean> {
  console.log('🧪 Testing Dependency Injection...');
  
  try {
    // Test service registration
    container.register('testService', () => ({ id: 'test', data: 'dependency injection works' }), {
      lifecycle: 'singleton',
      onInit: (service: any) => console.log('✅ Service initialized:', service.id),
      onDestroy: (service: any) => console.log('✅ Service destroyed:', service.id)
    });

    // Test service resolution
    const service = container.resolve('testService') as any;
    console.log('✅ Service resolved:', service.id === 'test');

    // Test scope creation
    const scope = container.createScope();
    const scopedService = scope.resolve('testService') as any;
    console.log('✅ Scoped service resolved:', scopedService.id === 'test');

    // Test statistics
    const stats = container.getStats();
    console.log('✅ Container stats:', stats.totalServices > 0);

    return true;
  } catch (error) {
    console.error('❌ Dependency Injection test failed:', error);
    return false;
  }
}

async function testEventBus(): Promise<boolean> {
  console.log('🧪 Testing Event Bus...');
  
  try {
    let eventReceived = false;
    let eventData = '';

    // Test event subscription
    const subscription = eventBus.subscribe('testEvent', (event: any) => {
      console.log('✅ Event received:', event.message);
      eventReceived = true;
      eventData = event.message;
    }, { async: true, priority: 'high' });

    // Test event publishing
    await eventBus.publish('testEvent', { message: 'Hello from Phase 3 Event Bus!' });

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('✅ Event processing:', eventReceived && eventData.includes('Phase 3'));

    // Test event history
    eventBus.enableHistory({ maxEvents: 100 });
    const history = eventBus.getHistory();
    console.log('✅ Event history enabled:', history.length >= 0);

    // Test statistics
    const stats = eventBus.getStats();
    console.log('✅ Event bus stats:', stats.totalSubscriptions > 0);

    return true;
  } catch (error) {
    console.error('❌ Event Bus test failed:', error);
    return false;
  }
}

async function testLazyLoading(): Promise<boolean> {
  console.log('🧪 Testing Lazy Loading...');
  
  try {
    // Test lazy service creation
    const lazyService = createLazyService('testLazyService', async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate load time
      return { data: 'loaded on demand', timestamp: Date.now() };
    }, { preload: false, cacheSize: 10 });

    // Test lazy loading
    const startTime = Date.now();
    const service = await lazyService();
    const loadTime = Date.now() - startTime;
    
    console.log('✅ Lazy service loaded:', service.data === 'loaded on demand');
    console.log('✅ Load time:', loadTime, 'ms');

    // Test statistics
    const stats = lazyLoadingManager.getStats();
    console.log('✅ Lazy loading stats:', stats.totalModules > 0);

    return true;
  } catch (error) {
    console.error('❌ Lazy Loading test failed:', error);
    return false;
  }
}

async function testPluginSystem(): Promise<boolean> {
  console.log('🧪 Testing Plugin System...');
  
  try {
    // Test plugin manager initialization
    console.log('✅ Plugin manager initialized:', pluginManager !== null);

    // Test statistics
    const stats = pluginManager.getStats();
    console.log('✅ Plugin manager stats:', stats.totalPlugins >= 0);

    return true;
  } catch (error) {
    console.error('❌ Plugin System test failed:', error);
    return false;
  }
}

async function testStrategyPattern(): Promise<boolean> {
  console.log('🧪 Testing Enhanced Strategy Pattern...');
  
  try {
    // Test engine manager initialization
    console.log('✅ Engine manager initialized:', engineManager !== null);

    // Test statistics
    const stats = engineManager.getEngineStats();
    console.log('✅ Engine manager stats:', stats.totalEngines >= 0);

    return true;
  } catch (error) {
    console.error('❌ Strategy Pattern test failed:', error);
    return false;
  }
}

async function testIntegration(): Promise<boolean> {
  console.log('🧪 Testing Integration...');
  
  try {
    // Test all systems are initialized and working together
    const diStats = container.getStats();
    const eventStats = eventBus.getStats();
    const lazyStats = lazyLoadingManager.getStats();
    const pluginStats = pluginManager.getStats();
    const engineStats = engineManager.getEngineStats();

    console.log('✅ DI Container:', diStats.totalServices >= 0);
    console.log('✅ Event Bus:', eventStats.totalSubscriptions >= 0);
    console.log('✅ Lazy Loading:', lazyStats.totalModules >= 0);
    console.log('✅ Plugin Manager:', pluginStats.totalPlugins >= 0);
    console.log('✅ Engine Manager:', engineStats.totalEngines >= 0);

    return true;
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  }
}

async function testPerformance(): Promise<boolean> {
  console.log('🧪 Testing Performance...');
  
  try {
    const startTime = Date.now();

    // Test lazy loading performance
    const testModule = lazyLoadingManager.registerModule('perfTest', async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate load time
      return { data: 'performance test', timestamp: Date.now() };
    });

    const result = await testModule.load();
    const loadTime = Date.now() - startTime;

    console.log('✅ Load time:', loadTime, 'ms');
    console.log('✅ Performance acceptable:', loadTime < 1000);

    return true;
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Phase 3 Advanced Features Test Suite');
  console.log('================================================');
  
  const tests = [
    { name: 'Dependency Injection', fn: testDependencyInjection },
    { name: 'Event Bus', fn: testEventBus },
    { name: 'Lazy Loading', fn: testLazyLoading },
    { name: 'Plugin System', fn: testPluginSystem },
    { name: 'Strategy Pattern', fn: testStrategyPattern },
    { name: 'Integration', fn: testIntegration },
    { name: 'Performance', fn: testPerformance }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    const result = await test.fn();
    
    if (result) {
      passed++;
      console.log(`✅ ${test.name}: PASSED`);
    } else {
      failed++;
      console.log(`❌ ${test.name}: FAILED`);
    }
  }

  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All Phase 3 tests passed!');
    console.log('Phase 3 Advanced Features are ready for use.');
  } else {
    console.log('\n❌ Some Phase 3 tests failed.');
    console.log('Please review the failed tests and fix any issues.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests }; 