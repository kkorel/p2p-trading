# **Rollout Trade Rules & Operating Principles**

*(Draft – for initial rollout participants)*

This note captures the agreed rules for trade creation, execution, and settlement for the rollout. These rules reflect **common consensus among participating stakeholders** and are **subject to final regulatory clearance**.

---

## **1\. Delivery / Fulfilment Windows**

* Energy delivery is organised in **fixed, non-overlapping 1-hour fulfilment windows**.  
* The delivery day runs from **06:00 hrs to 18:00 hrs**.

**Defined delivery blocks:**

* 06:00–07:00  
* 07:00–08:00  
* 08:00–09:00  
* …  
* 17:00–18:00

There are **no overlapping or partial delivery windows**.

### **Platform responsibility**

Buyers or sellers may specify delivery preferences in any format (either hourly or in multi-hour blocks). That’s the platform’s experience design. It is the **responsibility of the trading platform** to:

* Convert such inputs into the **standard hourly block format**, and  
* Clearly communicate the final mapped delivery blocks to the user.

**Example:**  
 If a user selects *08:30–10:00*, the platform must convert this to:

* 08:00–09:00 and  
* 09:00–10:00 blocks

---

## **2\. Trade Window & Gate Closure**

Each delivery block follows a defined trading timeline:

* **Trade window opens:** *T – 24 hours*  
* **Gate closure:** *T – 4 hours*

  * Where **T** is the **start time of the fulfilment block**

Once the **gate closure time** is reached:

* ❌ No new trades can be created  
* ❌ No existing trades can be modified  
* ❌ No updates or cancellations to the trade ledger are permitted by any trade platform

**Example:**  
 For the **10:00–11:00** am delivery block:

* Trade window opens at **10:00 am (previous day)**  
* Gate closes at **06:00 am (same day)**

## **3\. Minimum Trade Quantum**

* **Minimum trade size:** 1 kWh  
* Trades can be placed **up to two decimal places**

**Valid examples:**

* 1.00 kWh  
* 1.15 kWh  
* 3.75 kWh

---

## **4\. Partial Consumption by Buyers**

* Buyers are allowed to **partially consume** energy units available on catalog.   
* It is not a bid, hence there is no “full” or “nothing” concept. It is necessarily uploading the units available, and a buyer can choose to take full or parts of it.

**Example:**  
 If a seller has updated his catalog as **10 kWh** in a block:

* One buyer may consume **3 kWh**  
* Settlement applies only to **3 kWh**  
* Other buyers may consume the rest in full or parts.

Once a buyer puts a trade for consumption (3 units in the above example), **the seller should go and accordingly update the availability in catalog** (to 7 units as per the above example).

---

## **5\. Capacity-Based Trading Limits**

For any **hourly delivery block**, a participant can trade **only up to their installed generation capacity / sanctioned load.**

* **Prosumers / Sellers:**

  * Maximum tradable quantity ≤ *Installed generation capacity* (e.g., solar capacity)

* **Consumers / Buyers:**

  * Maximum tradable quantity ≤ *Sanctioned load*

This limit applies **per hourly block**, not per day.

**Example:**  
 If a prosumer has:

* Installed solar capacity \= **5 kW**

Then:

* Maximum trade in **any single hourly block** \= **5 kWh**  
* They cannot sell 6 kWh in the same block, even if daily generation allows it

\*\* The information of installed capacity or sanctioned load will be available in onboarding VC. 

\*\* If the installed generation capacity information is not available to the DISCOM, they will put the sanctioned load capacity in the installed capacity field.

---

## **6\. Meter & Customer Identification in Ledger**

* Every trade recorded in the ledger must include:

  * **Customer number**, and  
  * **Meter number**

Each trade is treated as a **composite function of (Customer ID \+ Meter ID)**.

The trade ledger will have this information in concatenated format under the consumer number field \- canumber|meternumber

This is critical for:

* Accurate allocation to the right meter,  
* Meter-level reconciliation, and  
* Settlement integrity.

---

## **7\. Trade Allocation & Ledger Read Sequence**

After delivery window (next day 9 am)

1. **Seller-side DISCOM reads the ledger first (at 9 am)**

   * Performs allocation on a **pro-rata basis**, if required in the ledger at (all of last day’s)  
   * They should write back to the ledger by 9:50 am.

2. **Buyer-side DISCOM then reads the ledger (at 10 am)**

   * Performs its corresponding allocation basis actual meter reading of the consumer of the said fulfilment window  
   * If consumer allocation \> prosumer allocation \- then copy prosumer allocation in consumer allocation cell  
   * Else, keep actual  
   * The allocation data should be written back by 10:50 am.  
3. Seller-side DISCOM reads the buyer-side DISCOM allocation again **(at 11 am)**  and updates in case there is a mismatch by 11:50 am.  
     
* Allocation on the DISCOM side will be **pro-rata**, not FIFO or discretionary.  
* A **clear [reference allocation logic](https://github.com/beckn/DEG/blob/p2p-trading/docs/implementation-guides/v2/P2P_Trading/note-on-allocation-settlement-logic.md)** is published here and can be used as a reference.

---

## **7b. DISCOM bill**

DISCOM bills should be adjusted (end of month) as per the finalised allocations done for all cumulative trends of the month.

For AI summit- we will show a template bill (the bill template should be ready and populated with one users’ information  
---

## **8\. Payment Flow**

* Refer to the [flow of payments](https://docs.google.com/document/d/1dHilJIM9m3jfPuSCdhn5SB6SBsBA9Tw6MbbGCt2bxqU/edit?usp=sharing) document here.  
* Platforms to **deploy the user to platform payment flow by 4th February**.  
* Detailed payment mechanics for platform to platform payment to be communicated separately (by 2nd Feb).

---

## **9\. Regulatory Note**

All rules outlined above are based on **collective agreement during stakeholder discussions** and are **subject to final regulatory approval**. Any required changes post-approval will be communicated formally.

Furthermore, the principles described are preliminary and are also **subject to review and potential modification based on final architecture decisions**. Specifically, aspects concerning **system timelines, and platform integration mechanics** may be refined following the experience and data gathered during the initial launch phase to optimize the system. Stakeholders will be notified of any substantive changes resulting from this post-launch architectural review.  
---

## **11\. Recommended Trade Stages**

This is for UI reference only. Not to be strictly followed if platforms have a better/ user-friendly representation. This is for reference of a common shared understanding and definitions only.**9\. Regulatory Approval and Architectural Disclaimer**
