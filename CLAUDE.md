# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A data-only workspace for expense-processing tasks (Udemy course material). There is no source code, build system, package manager, tests, or git repo yet. Work here is typically reading the input data and producing outputs from it, such as aggregations, reports, receipt transcription, or reconciliation.

## Data layout

- `src/csv/2024-MM-expense.csv`: one file per month of 2024 (12 files, roughly 35–46 rows each).
  - Header: `date,description,category,amount_jpy`
  - **UTF-8 with BOM.** Strip it when parsing (e.g. `encoding="utf-8-sig"` in Python), or the first column comes out as `﻿date`.
  - LF line endings, no quoted fields, always 4 columns. `amount_jpy` is a plain integer (no commas or `¥`). Dates are `YYYY-MM-DD`.
  - Descriptions and categories are in Japanese. Fixed category set: `SaaS/ソフトウェア`, `食費/外食`, `通信/公共料金`, `クラウド/インフラ`, `物品/EC`, `交通/レジャー`, `サブスク/エンタメ`, `保険`.
  - Many rows are recurring monthly charges (internet, SaaS plans, cloud, insurance) with fictional vendor names.
- `src/receipts/receipt_NN_<type>.jpg`: 10 scanned Japanese receipts (領収書), e.g. cafe, conveni, taxi, book, hotel, denki, drug, izakaya, gas, super. Each one shows the date, store, line items, subtotal, the 10%/8% tax breakdown, the total (合計), payment details, and the invoice registration number (登録番号 T…).

## Pitfalls when reading receipts

- On some receipts the price column is **shifted one row down** from its labels. In `receipt_01_cafe.jpg`, for example, the first item has no price beside it, and the change amount (お釣り) sits below the last label. Pair each label with the amount on the row below it, and check by confirming that the line items add up to 小計/合計 and that お預り − 合計 = お釣り.
- Some images are slightly rotated.
- Receipt dates fall in 2024 and can be cross-checked against the matching monthly CSV.
