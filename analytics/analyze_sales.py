#!/usr/bin/env python3
"""
analytics/analyze_sales.py
KolkataKraft — Python Analytics Script
-------------------------------------------
Run this script on the exported CSV from the admin analytics dashboard.

Usage:
    python analyze_sales.py --file kolkatakraft_analytics.csv

Output:
    - Sales trends (by day/week)
    - Customer segmentation
    - Top products report
    - Revenue by category
    - Exported summary report

Requirements:
    pip install pandas matplotlib seaborn
"""

import sys
import argparse
import json
from datetime import datetime
from collections import defaultdict

def parse_args():
    parser = argparse.ArgumentParser(description='KolkataKraft Sales Analytics')
    parser.add_argument('--file', '-f', default='kolkatakraft_analytics.csv', help='Path to CSV export')
    parser.add_argument('--output', '-o', default='analytics_report.json', help='Output report file')
    parser.add_argument('--no-plot', action='store_true', help='Skip matplotlib charts')
    return parser.parse_args()

def load_csv(path):
    """Load CSV manually (no pandas required for basic mode)"""
    import csv
    rows = []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"✅ Loaded {len(rows)} records from {path}")
    return rows

def analyze_sales_trends(rows):
    """Aggregate sales by date"""
    daily = defaultdict(lambda: {'orders': set(), 'revenue': 0.0, 'units': 0})
    for row in rows:
        date = row.get('created_at', '')[:10]  # YYYY-MM-DD
        oid = row.get('order_id', '')
        revenue = float(row.get('price', 0)) * int(row.get('quantity', 0))
        daily[date]['orders'].add(oid)
        daily[date]['revenue'] += revenue
        daily[date]['units'] += int(row.get('quantity', 0) or 0)

    trend = []
    for date in sorted(daily.keys()):
        d = daily[date]
        trend.append({
            'date': date,
            'orders': len(d['orders']),
            'revenue': round(d['revenue'], 2),
            'units_sold': d['units']
        })
    return trend

def analyze_customer_segments(rows):
    """Simple RFM-style segmentation: Champions, Loyals, At Risk"""
    customer_orders = defaultdict(lambda: {'count': 0, 'revenue': 0.0, 'email': '', 'name': ''})
    for row in rows:
        email = row.get('email', '')
        if not email: continue
        customer_orders[email]['count'] += 1
        customer_orders[email]['revenue'] += float(row.get('price', 0)) * int(row.get('quantity', 0) or 0)
        customer_orders[email]['name'] = row.get('customer', email)
        customer_orders[email]['email'] = email

    segments = {'champions': [], 'loyal': [], 'at_risk': [], 'new': []}
    for email, data in customer_orders.items():
        c = data['count']
        rev = data['revenue']
        entry = {'name': data['name'], 'email': email, 'orders': c, 'lifetime_value': round(rev, 2)}
        if c >= 5 and rev >= 10000:
            segments['champions'].append(entry)
        elif c >= 3:
            segments['loyal'].append(entry)
        elif c >= 2:
            segments['at_risk'].append(entry)
        else:
            segments['new'].append(entry)

    return segments

def analyze_top_products(rows):
    """Find best-selling products by revenue and units"""
    products = defaultdict(lambda: {'name': '', 'category': '', 'units': 0, 'revenue': 0.0})
    for row in rows:
        pid = row.get('product', '')
        cat = row.get('category', '')
        qty = int(row.get('quantity', 0) or 0)
        price = float(row.get('price', 0) or 0)
        products[pid]['name'] = pid
        products[pid]['category'] = cat
        products[pid]['units'] += qty
        products[pid]['revenue'] += qty * price

    sorted_products = sorted(products.values(), key=lambda x: x['revenue'], reverse=True)
    for p in sorted_products:
        p['revenue'] = round(p['revenue'], 2)
    return sorted_products[:10]

def analyze_category_performance(rows):
    """Revenue breakdown by product category"""
    cats = defaultdict(lambda: {'revenue': 0.0, 'units': 0, 'orders': set()})
    for row in rows:
        cat = row.get('category', 'Unknown')
        qty = int(row.get('quantity', 0) or 0)
        price = float(row.get('price', 0) or 0)
        oid = row.get('order_id', '')
        cats[cat]['revenue'] += qty * price
        cats[cat]['units'] += qty
        cats[cat]['orders'].add(oid)

    result = []
    for cat, data in sorted(cats.items(), key=lambda x: x[1]['revenue'], reverse=True):
        result.append({
            'category': cat,
            'revenue': round(data['revenue'], 2),
            'units_sold': data['units'],
            'order_count': len(data['orders'])
        })
    return result

def print_report(report):
    """Pretty print to console"""
    print("\n" + "="*60)
    print("  📊 KOLKATAKRAFT SALES ANALYTICS REPORT")
    print(f"  Generated: {datetime.now().strftime('%d %b %Y, %H:%M')}")
    print("="*60)

    print("\n📈 SALES TREND (last entries):")
    for day in report['sales_trend'][-7:]:
        bar = '█' * min(int(day['revenue'] / 500), 30)
        print(f"  {day['date']}  {bar}  ₹{day['revenue']:,.2f}  ({day['orders']} orders)")

    print("\n🏆 TOP 5 PRODUCTS:")
    for i, p in enumerate(report['top_products'][:5], 1):
        print(f"  {i}. {p['name'][:40]:<40}  {p['units']:>4} units  ₹{p['revenue']:>10,.2f}")

    print("\n📦 CATEGORY PERFORMANCE:")
    for c in report['category_performance']:
        bar = '█' * min(int(c['revenue'] / 500), 25)
        print(f"  {c['category']:<15}  {bar}  ₹{c['revenue']:,.2f}")

    print("\n👥 CUSTOMER SEGMENTS:")
    segs = report['customer_segments']
    print(f"  🏆 Champions (high-value repeat buyers): {len(segs['champions'])}")
    print(f"  💙 Loyal Customers:                       {len(segs['loyal'])}")
    print(f"  ⚠️  At Risk (2 orders, no recent):        {len(segs['at_risk'])}")
    print(f"  🆕 New Customers:                         {len(segs['new'])}")

    total_rev = sum(c['revenue'] for c in report['category_performance'])
    total_orders = sum(d['orders'] for d in report['sales_trend'])
    print(f"\n💰 TOTAL REVENUE: ₹{total_rev:,.2f}")
    print(f"📦 TOTAL ORDERS:  {total_orders}")
    print("="*60 + "\n")

def plot_charts(report):
    """Generate matplotlib charts"""
    try:
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('KolkataKraft Analytics Dashboard', fontsize=16, fontweight='bold', color='#2C3E7A')

        # 1. Sales trend
        ax1 = axes[0, 0]
        if report['sales_trend']:
            dates = [d['date'] for d in report['sales_trend']]
            revenues = [d['revenue'] for d in report['sales_trend']]
            ax1.fill_between(range(len(dates)), revenues, alpha=0.3, color='#C1440E')
            ax1.plot(range(len(dates)), revenues, color='#C1440E', linewidth=2)
            ax1.set_title('Daily Revenue Trend', fontweight='bold')
            ax1.set_ylabel('Revenue (₹)')
            ax1.set_xticks(range(0, len(dates), max(1, len(dates)//5)))
            ax1.set_xticklabels([dates[i][:5] for i in range(0, len(dates), max(1, len(dates)//5))], rotation=45)
            ax1.grid(axis='y', alpha=0.3)

        # 2. Category pie
        ax2 = axes[0, 1]
        cats = report['category_performance']
        if cats:
            labels = [c['category'] for c in cats]
            sizes = [c['revenue'] for c in cats]
            colors = ['#C1440E', '#2C3E7A', '#D4A017', '#2D7A4F', '#7A6F65']
            ax2.pie(sizes, labels=labels, colors=colors[:len(labels)], autopct='%1.1f%%', startangle=90)
            ax2.set_title('Revenue by Category', fontweight='bold')

        # 3. Top products bar
        ax3 = axes[1, 0]
        top5 = report['top_products'][:5]
        if top5:
            names = [p['name'][:20] + ('…' if len(p['name']) > 20 else '') for p in top5]
            revenues = [p['revenue'] for p in top5]
            bars = ax3.barh(names, revenues, color='#2C3E7A', alpha=0.85)
            ax3.set_title('Top 5 Products by Revenue', fontweight='bold')
            ax3.set_xlabel('Revenue (₹)')
            for bar, rev in zip(bars, revenues):
                ax3.text(bar.get_width() + 10, bar.get_y() + bar.get_height()/2,
                        f'₹{rev:,.0f}', va='center', fontsize=8)

        # 4. Customer segments
        ax4 = axes[1, 1]
        segs = report['customer_segments']
        seg_labels = ['Champions', 'Loyal', 'At Risk', 'New']
        seg_counts = [len(segs['champions']), len(segs['loyal']), len(segs['at_risk']), len(segs['new'])]
        seg_colors = ['#D4A017', '#2C3E7A', '#C1440E', '#2D7A4F']
        if sum(seg_counts) > 0:
            ax4.bar(seg_labels, seg_counts, color=seg_colors, alpha=0.85)
            ax4.set_title('Customer Segmentation (RFM)', fontweight='bold')
            ax4.set_ylabel('Number of Customers')
            for i, (label, count) in enumerate(zip(seg_labels, seg_counts)):
                ax4.text(i, count + 0.05, str(count), ha='center', fontweight='bold')

        plt.tight_layout()
        plt.savefig('kolkatakraft_analytics_charts.png', dpi=150, bbox_inches='tight')
        print("📊 Charts saved to: kolkatakraft_analytics_charts.png")
        plt.show()

    except ImportError:
        print("⚠️  matplotlib not installed. Run: pip install matplotlib")
    except Exception as e:
        print(f"⚠️  Chart generation failed: {e}")

def main():
    args = parse_args()

    try:
        rows = load_csv(args.file)
    except FileNotFoundError:
        print(f"❌ File not found: {args.file}")
        print("   Export CSV from Admin Dashboard → Analytics → Export CSV")
        sys.exit(1)

    # Run all analyses
    report = {
        'generated_at': datetime.now().isoformat(),
        'total_records': len(rows),
        'sales_trend': analyze_sales_trends(rows),
        'top_products': analyze_top_products(rows),
        'category_performance': analyze_category_performance(rows),
        'customer_segments': analyze_customer_segments(rows),
    }

    print_report(report)

    # Save JSON report
    with open(args.output, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    print(f"📄 JSON report saved: {args.output}")

    # Charts
    if not args.no_plot:
        plot_charts(report)

if __name__ == '__main__':
    main()