/**
 * Continuous Improvement Service
 *
 * Automated testing loop that:
 * - Runs daily tests
 * - Tracks trends over time
 * - Alerts on quality degradation
 * - Suggests improvements
 */

import { supabase } from '@/lib/supabase';
import { CoachTestingService } from './CoachTestingService';
import { FoodAnalyzerTestingService } from './FoodAnalyzerTestingService';

interface DailyReport {
  report_date: string;
  coach_tests: any;
  food_tests: any;
  overall_health: number;
  total_tests: number;
  tests_passed: number;
  tests_failed: number;
  critical_failures: number;
  notes?: string;
}

interface TrendAnalysis {
  period_days: number;
  avg_health: number;
  recent_health: number;
  trend: 'improving' | 'stable' | 'declining';
  critical_issues: string[];
  recommendations: string[];
}

export class ContinuousImprovementService {
  /**
   * Run automated daily tests
   */
  static async runDailyTests(): Promise<DailyReport> {
    console.log('═══════════════════════════════════════════');
    console.log('🔄 DAILY AI TESTING CYCLE');
    console.log('═══════════════════════════════════════════');
    console.log(`Date: ${new Date().toLocaleDateString()}`);
    console.log(`Time: ${new Date().toLocaleTimeString()}\n`);

    try {
      // Test AI coaches
      console.log('🤖 Testing AI Coaches...\n');
      const coachResults = await CoachTestingService.runFullTestSuite();

      // Test food analyzer
      console.log('\n🍕 Testing Food Analyzer...\n');
      const foodResults = await FoodAnalyzerTestingService.runFullTestSuite();

      // Calculate overall health
      const overallHealth = this.calculateOverallHealth(coachResults, foodResults);

      // Count critical failures (safety failures)
      const criticalFailures = coachResults.results.filter(
        r => !r.passed && r.evaluation.safety_score < 80
      ).length;

      // Generate report
      const report: DailyReport = {
        report_date: new Date().toISOString().split('T')[0],
        coach_tests: {
          total: coachResults.total,
          passed: coachResults.passed,
          failed: coachResults.failed,
          summary: coachResults.summary
        },
        food_tests: {
          total: foodResults.total,
          passed: foodResults.passed,
          failed: foodResults.failed,
          avg_calorie_error: foodResults.avg_calorie_error,
          avg_macro_error: foodResults.avg_macro_error,
          allergen_accuracy: foodResults.allergen_accuracy
        },
        overall_health: overallHealth,
        total_tests: coachResults.total + foodResults.total,
        tests_passed: coachResults.passed + foodResults.passed,
        tests_failed: coachResults.failed + foodResults.failed,
        critical_failures: criticalFailures
      };

      // Save report to database
      await this.saveDailyReport(report);

      // Alert if quality drops
      if (overallHealth < 70) {
        console.warn('\n⚠️  AI QUALITY ALERT: Performance below threshold!');
        console.warn(`   Overall Health: ${overallHealth.toFixed(1)}%`);
        console.warn(`   Critical Failures: ${criticalFailures}`);
        console.warn('   Action required: Review failed test cases\n');
      } else if (overallHealth >= 90) {
        console.log(`\n✅ Excellent AI Performance: ${overallHealth.toFixed(1)}%\n`);
      } else {
        console.log(`\n📊 AI Performance: ${overallHealth.toFixed(1)}% (Acceptable)\n`);
      }

      console.log('═══════════════════════════════════════════');
      console.log('Daily testing cycle complete');
      console.log('═══════════════════════════════════════════\n');

      return report;
    } catch (error) {
      console.error('Error running daily tests:', error);
      throw error;
    }
  }

  /**
   * Calculate overall AI health score
   */
  private static calculateOverallHealth(coachResults: any, foodResults: any): number {
    // Coach pass rate (60% weight)
    const coachScore = (coachResults.passed / coachResults.total) * 100 * 0.6;

    // Food pass rate (40% weight)
    const foodScore = (foodResults.passed / foodResults.total) * 100 * 0.4;

    return Math.round(coachScore + foodScore);
  }

  /**
   * Save daily report to database
   */
  private static async saveDailyReport(report: DailyReport) {
    try {
      const { error } = await supabase
        .from('daily_ai_test_reports')
        .upsert({
          report_date: report.report_date,
          coach_tests: report.coach_tests,
          food_tests: report.food_tests,
          overall_health: report.overall_health,
          total_tests: report.total_tests,
          tests_passed: report.tests_passed,
          tests_failed: report.tests_failed,
          critical_failures: report.critical_failures,
          notes: report.notes
        }, {
          onConflict: 'report_date'
        });

      if (error) {
        console.error('Error saving daily report:', error);
      }
    } catch (error) {
      console.error('Error saving daily report:', error);
    }
  }

  /**
   * Analyze trends over time
   */
  static async analyzeTrends(daysBack: number = 30): Promise<TrendAnalysis> {
    console.log(`\n📈 Analyzing ${daysBack}-day trends...\n`);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data: reports, error } = await supabase
        .from('daily_ai_test_reports')
        .select('*')
        .gte('report_date', cutoffDate.toISOString().split('T')[0])
        .order('report_date', { ascending: true });

      if (error) throw error;

      if (!reports || reports.length === 0) {
        console.log('No historical data available yet\n');
        return {
          period_days: daysBack,
          avg_health: 0,
          recent_health: 0,
          trend: 'stable',
          critical_issues: [],
          recommendations: ['Run daily tests to build historical data']
        };
      }

      // Calculate metrics
      const avgHealth = reports.reduce((sum: number, r: any) => sum + r.overall_health, 0) / reports.length;
      const recentReports = reports.slice(-7);
      const recentHealth = recentReports.reduce((sum: number, r: any) => sum + r.overall_health, 0) / recentReports.length;

      // Determine trend
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentHealth > avgHealth + 5) {
        trend = 'improving';
      } else if (recentHealth < avgHealth - 5) {
        trend = 'declining';
      }

      console.log(`Period: ${daysBack} days`);
      console.log(`Data Points: ${reports.length}`);
      console.log(`Average Health: ${avgHealth.toFixed(1)}%`);
      console.log(`Recent Health (7 days): ${recentHealth.toFixed(1)}%`);
      console.log(`Trend: ${trend === 'improving' ? '📈 Improving' : trend === 'declining' ? '📉 Declining' : '➡️  Stable'}\n`);

      // Identify critical issues
      const criticalIssues = await this.identifyCriticalIssues();

      // Generate recommendations
      const recommendations = this.generateRecommendations(avgHealth, trend, criticalIssues);

      if (criticalIssues.length > 0) {
        console.log('⚠️  Critical Issues:');
        criticalIssues.forEach(issue => console.log(`   - ${issue}`));
        console.log('');
      }

      if (recommendations.length > 0) {
        console.log('💡 Recommendations:');
        recommendations.forEach(rec => console.log(`   - ${rec}`));
        console.log('');
      }

      return {
        period_days: daysBack,
        avg_health: avgHealth,
        recent_health: recentHealth,
        trend,
        critical_issues: criticalIssues,
        recommendations
      };
    } catch (error) {
      console.error('Error analyzing trends:', error);
      throw error;
    }
  }

  /**
   * Identify critical issues from recent failures
   */
  private static async identifyCriticalIssues(): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check for recent coach safety failures
      const { data: coachFailures } = await supabase
        .from('ai_coach_test_results')
        .select('scenario_id, category, safety_score, flags')
        .eq('passed', false)
        .gte('test_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('test_timestamp', { ascending: false })
        .limit(10);

      if (coachFailures && coachFailures.length > 0) {
        const safetyFailures = coachFailures.filter((f: any) => f.category === 'safety');
        if (safetyFailures.length > 0) {
          issues.push(`${safetyFailures.length} safety test failures in last 7 days (CRITICAL)`);
        }

        const commonFlags = this.getMostCommonFlags(coachFailures);
        if (commonFlags.length > 0) {
          issues.push(`Common failure patterns: ${commonFlags.join(', ')}`);
        }
      }

      // Check for food allergen detection failures
      const { data: foodFailures } = await supabase
        .from('food_analyzer_test_results')
        .select('test_id, category, allergen_detection')
        .eq('allergen_detection', false)
        .gte('test_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (foodFailures && foodFailures.length > 0) {
        issues.push(`${foodFailures.length} allergen detection failures (CRITICAL)`);
      }
    } catch (error) {
      console.error('Error identifying critical issues:', error);
    }

    return issues;
  }

  /**
   * Get most common failure flags
   */
  private static getMostCommonFlags(failures: any[]): string[] {
    const flagCounts: { [key: string]: number } = {};

    failures.forEach((f: any) => {
      if (f.flags && Array.isArray(f.flags)) {
        f.flags.forEach((flag: string) => {
          flagCounts[flag] = (flagCounts[flag] || 0) + 1;
        });
      }
    });

    return Object.entries(flagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([flag]) => flag);
  }

  /**
   * Generate recommendations based on analysis
   */
  private static generateRecommendations(
    avgHealth: number,
    trend: string,
    criticalIssues: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (avgHealth < 70) {
      recommendations.push('Overall AI quality is below acceptable threshold - immediate review needed');
    }

    if (trend === 'declining') {
      recommendations.push('Quality is declining - review recent prompt changes or model updates');
    }

    if (criticalIssues.some(issue => issue.includes('safety'))) {
      recommendations.push('URGENT: Review and strengthen safety guardrails in coach prompts');
    }

    if (criticalIssues.some(issue => issue.includes('allergen'))) {
      recommendations.push('URGENT: Improve allergen detection in food analyzer');
    }

    if (avgHealth >= 90 && trend === 'improving') {
      recommendations.push('Excellent performance - consider adding more complex test scenarios');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring - performance is acceptable');
    }

    return recommendations;
  }

  /**
   * Get system health summary
   */
  static async getSystemHealthSummary(): Promise<{
    current_health: number;
    trend_7d: string;
    critical_issues: number;
    last_test_date: string;
  }> {
    try {
      const { data: latestReport } = await supabase
        .from('daily_ai_test_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(1)
        .single();

      if (!latestReport) {
        return {
          current_health: 0,
          trend_7d: 'no data',
          critical_issues: 0,
          last_test_date: 'never'
        };
      }

      const trends = await this.analyzeTrends(7);

      return {
        current_health: latestReport.overall_health,
        trend_7d: trends.trend,
        critical_issues: latestReport.critical_failures,
        last_test_date: latestReport.report_date
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        current_health: 0,
        trend_7d: 'error',
        critical_issues: 0,
        last_test_date: 'error'
      };
    }
  }

  /**
   * Export test results for analysis
   */
  static async exportTestResults(daysBack: number = 7): Promise<{
    coach_results: any[];
    food_results: any[];
    daily_reports: any[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoff = cutoffDate.toISOString();

    const [coachResults, foodResults, dailyReports] = await Promise.all([
      supabase
        .from('ai_coach_test_results')
        .select('*')
        .gte('test_timestamp', cutoff)
        .order('test_timestamp', { ascending: false }),

      supabase
        .from('food_analyzer_test_results')
        .select('*')
        .gte('test_timestamp', cutoff)
        .order('test_timestamp', { ascending: false }),

      supabase
        .from('daily_ai_test_reports')
        .select('*')
        .gte('report_date', cutoffDate.toISOString().split('T')[0])
        .order('report_date', { ascending: false })
    ]);

    return {
      coach_results: coachResults.data || [],
      food_results: foodResults.data || [],
      daily_reports: dailyReports.data || []
    };
  }
}
