# Kamiwaza 1.3.4 verification report

Evidence date: 2026-10-26

## Scope

This dated interpretation corrects release attribution for the running capability inventory. It adds no test pass. The original captures, native stamps, source hashes, test dates and previously published reports remain unchanged.

## Results

73 of 87 capabilities have accepted scoped proofs across recorded builds; 14 have no accepted scoped proof. All 58 historical prerelease entries remain preserved separately. These are cumulative distinct-capability counts, not 73 passes against one frozen release bill of materials.

The dataset-registry and ingestion-job/managed-connector proofs used corrective release/1.3.0 API builds alongside tagged 1.3.4 platform components. That branch is now the 1.3.5 development line. These two results are scoped proofs on post-v1.3.4 corrective builds and candidate evidence for 1.3.5 qualification. Native designation or carry remains pending; they do not certify the original 1.3.4 tag or a final 1.3.5 release.

The other 71 proofs reference tagged 1.3.4 Core. Their extension, operator, model and configuration identities remain separately qualified by the recorded evidence. A tagged Core reference alone does not prove that the entire deployed component set belongs to the original release.

## Evidence

The accepted cumulative source remains capability-kit commit f42394c55d5a331c09a1c0e28504a2035223553b. The dated public interpretation is current-verification/1.3.4/2026-10-26-version-attribution.json. It preserves every native proof field and all historical entries; only the two corrective capability scope notes add the current interpretation, preserving the operator-asserted source basis.

Catalog source: c5132d69170a2361e2ae164916fc0a5d3e96b873; corrective API image e2cfdf44f81916ea40f86d6b120be070004905b3f14bacab366d12e72dc0e67c. Ingestion source: e301cd3db8b4568605e1b5d9d04eb0fb98f199d5; corrective API image 4f45bcdb77689283a80d048505be67ec6359d267114fd8a02e7b06dbb6da2ad8. Both retain platform ray/scheduler image 4a0e33707443a07192c517fb475a966518e44944724691e027993506c2c0f612.

Component examples show why Core alone is insufficient: the sandbox proof records Operator source 25f6fc0adab29104bdc04741b3c801cf2a6c3792 and Agent Sandbox v0.5.2; primary Kaizen package/delegation records different API, sidecar and frontend component sources. Exact image and source receipts remain in their canonical evidence packets.

Canonical attribution guidance: https://github.com/kamiwaza-internal/capability-kit/blob/main/docs/verification-version-attribution.md

## Limits and assumptions

A successful scoped test remains evidence of the behavior on its captured build. Changing the current release designation does not erase that proof, change the original target label or imply a new test occurred. No final 1.3.5 release hash is asserted.

Release certification and carry-forward credit require an explicit target-build qualification and reviewed change-impact decision, retaining scope and component identities. Historical prerelease evidence and a branch name alone are insufficient. The running inventory is not a complete 1.4.0 delta inventory or a whole-value-stream completion count.

## Remaining work

Qualify each relevant component against the intended released bill of materials; replay affected deltas and preserve applicable unchanged evidence through reviewed carry-forward decisions. Continue the 14 capabilities without accepted scoped proof. Publication of this interpretation changes labels, not the cumulative proof count.
