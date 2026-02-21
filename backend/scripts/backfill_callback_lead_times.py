#!/usr/bin/env python3
"""
Backfill callback lead appointment date/time from created_at (or timestamp)
in a consistent business timezone.

Usage:
  python scripts/backfill_callback_lead_times.py                # dry run
  python scripts/backfill_callback_lead_times.py --apply        # write changes
  python scripts/backfill_callback_lead_times.py --apply --time-zone America/New_York
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill callback lead appointment timestamps")
    parser.add_argument("--apply", action="store_true", help="Persist updates to DynamoDB")
    parser.add_argument(
        "--time-zone",
        default=os.getenv("BUSINESS_TIME_ZONE", "America/New_York"),
        help="IANA timezone used to derive appointment_date/time",
    )
    parser.add_argument(
        "--table",
        default=os.getenv("REPAIRS_LEAD_LOG_TABLE", "Repairs_Lead_Log"),
        help="DynamoDB leads table name",
    )
    parser.add_argument(
        "--region",
        default=os.getenv("AWS_REGION") or os.getenv("DYNAMODB_REGION", "us-east-1"),
        help="AWS region",
    )
    return parser.parse_args()


def format_business_time(epoch_seconds: int, time_zone: str) -> tuple[str, str]:
    dt = datetime.fromtimestamp(epoch_seconds, tz=ZoneInfo(time_zone))
    date_str = dt.strftime("%Y-%m-%d")
    time_str = dt.strftime("%I:%M %p").lstrip("0")
    return date_str, time_str


def to_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, Decimal):
        return int(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return int(float(text))
        except ValueError:
            return None
    return None


def is_callback_lead(item: dict[str, Any]) -> bool:
    lead_type = item.get("lead_type")
    lead_id = item.get("lead_id")
    if isinstance(lead_type, str) and lead_type.strip().lower() == "callback":
        return True
    if isinstance(lead_id, str) and lead_id.startswith("CALLBACK-"):
        return True
    return False


def main() -> int:
    load_dotenv()
    args = parse_args()

    try:
        tz = ZoneInfo(args.time_zone)
        _ = tz
    except Exception:
        print(f"❌ Invalid timezone: {args.time_zone}")
        return 1

    dynamodb = boto3.resource("dynamodb", region_name=args.region)
    table = dynamodb.Table(args.table)

    print("🔎 Scanning callback leads...")
    print(f"   Table: {args.table}")
    print(f"   Region: {args.region}")
    print(f"   Timezone: {args.time_zone}")
    print(f"   Mode: {'APPLY' if args.apply else 'DRY RUN'}")

    scanned = 0
    callback_count = 0
    candidate_count = 0
    updated_count = 0
    skipped_missing_epoch = 0

    scan_kwargs: dict[str, Any] = {
        "FilterExpression": Attr("lead_id").begins_with("CALLBACK-") | Attr("lead_type").eq("callback"),
    }

    try:
        while True:
            response = table.scan(**scan_kwargs)
            items = response.get("Items", [])
            scanned += len(items)

            for item in items:
                if not is_callback_lead(item):
                    continue

                callback_count += 1
                epoch = to_int(item.get("created_at"))
                if epoch is None:
                    epoch = to_int(item.get("timestamp"))

                if epoch is None:
                    skipped_missing_epoch += 1
                    continue

                expected_date, expected_time = format_business_time(epoch, args.time_zone)
                existing_date = item.get("appointment_date")
                existing_time = item.get("appointment_time")

                if existing_date == expected_date and existing_time == expected_time:
                    continue

                candidate_count += 1
                lead_id = str(item.get("lead_id", ""))
                sort_key = to_int(item.get("timestamp"))
                if sort_key is None:
                    skipped_missing_epoch += 1
                    continue

                print(
                    f"   {'[APPLY]' if args.apply else '[DRY]  '} {lead_id} "
                    f"{existing_date} {existing_time} -> {expected_date} {expected_time}"
                )

                if args.apply:
                    table.update_item(
                        Key={"lead_id": lead_id, "timestamp": sort_key},
                        UpdateExpression="SET appointment_date = :date, appointment_time = :time",
                        ExpressionAttributeValues={
                            ":date": expected_date,
                            ":time": expected_time,
                        },
                    )
                    updated_count += 1

            last_key = response.get("LastEvaluatedKey")
            if not last_key:
                break
            scan_kwargs["ExclusiveStartKey"] = last_key

    except (ClientError, BotoCoreError) as error:
        print(f"❌ DynamoDB error: {error}")
        return 1

    print("\n✅ Backfill complete")
    print(f"   callback leads scanned: {callback_count}")
    print(f"   needing normalization: {candidate_count}")
    print(f"   updated: {updated_count}")
    print(f"   skipped (missing epoch): {skipped_missing_epoch}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
