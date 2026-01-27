
Points 1:
1) verify ledger read mocks are according to actual beckn specs (so when they are not mocked it works pefectly)
2) order cancellation (after reading + reading has confirmed from DISCOM)
3) escrow releasing (after reading + reading has confirmed DISCOM)
4) trust score update (after reading + reading has confirmed from DISCOM)
5) anything else that happens currently on mock (such as DISCOMS) should happen after reading from the ledger only when the read confirms the trade allocation. 
6) Partial fulfillment (only happens after reading)

Points 2:
1) Remove hard limit based on trust score, make it just an advice
2) Make verifiable credential verification a section in the profile
3) Clean up the app (technical debt)

