
# Run a single cvl e.g.:
#  make -B spec/certora/RBep20/borrowAndRepayFresh.cvl

# TODO:
#  - mintAndRedeemFresh.cvl in progress and is failing due to issues with tool proving how the exchange rate can change
#    hoping for better division modelling - currently fails to prove (a + 1) / b >= a / b
#  - RBep20Delegator/*.cvl cannot yet be run with the tool
#  - rDAI proofs are WIP, require using the delegate and the new revert message assertions

.PHONY: certora-clean

CERTORA_BIN = $(abspath script/certora)
CERTORA_RUN = $(CERTORA_BIN)/run.py
CERTORA_CLI = $(CERTORA_BIN)/cli.jar
CERTORA_EMV = $(CERTORA_BIN)/emv.jar

export CERTORA = $(CERTORA_BIN)
export CERTORA_DISABLE_POPUP = 1

spec/certora/Math/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/MathCertora.sol \
	--verify \
	 MathCertora:$@

spec/certora/Rifi/search.cvl:
	$(CERTORA_RUN) \
	spec/certora/contracts/RifiCertora.sol \
	--settings -b=4,-graphDrawLimit=0,-assumeUnwindCond,-depth=100 \
	--solc_args "'--evm-version istanbul'" \
	--verify \
	 RifiCertora:$@

spec/certora/Rifi/transfer.cvl:
	$(CERTORA_RUN) \
	spec/certora/contracts/RifiCertora.sol \
	--settings -graphDrawLimit=0,-assumeUnwindCond,-depth=100 \
	--solc_args "'--evm-version istanbul'" \
	--verify \
	 RifiCertora:$@

spec/certora/Governor/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/GovernorAlphaCertora.sol \
	 spec/certora/contracts/TimelockCertora.sol \
	 spec/certora/contracts/RifiCertora.sol \
	 --settings -assumeUnwindCond,-enableWildcardInlining=false \
	 --solc_args "'--evm-version istanbul'" \
	 --link \
	 GovernorAlphaCertora:timelock=TimelockCertora \
	 GovernorAlphaCertora:rifi=RifiCertora \
	--verify \
	 GovernorAlphaCertora:$@

spec/certora/Cointroller/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/CointrollerCertora.sol \
	 spec/certora/contracts/PriceOracleModel.sol \
	--link \
	 CointrollerCertora:oracle=PriceOracleModel \
	--verify \
	 CointrollerCertora:$@

spec/certora/rDAI/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/RDaiDelegateCertora.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	 spec/certora/contracts/mcd/dai.sol:Dai \
	 spec/certora/contracts/mcd/pot.sol:Pot \
	 spec/certora/contracts/mcd/vat.sol:Vat \
	 spec/certora/contracts/mcd/join.sol:DaiJoin \
	 tests/Contracts/BoolCointroller.sol \
	--link \
	 RDaiDelegateCertora:cointroller=BoolCointroller \
	 RDaiDelegateCertora:underlying=Dai \
	 RDaiDelegateCertora:potAddress=Pot \
	 RDaiDelegateCertora:vatAddress=Vat \
	 RDaiDelegateCertora:daiJoinAddress=DaiJoin \
	--verify \
	 RDaiDelegateCertora:$@ \
	--settings -cache=certora-run-cdai

spec/certora/RBep20/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/RBep20ImmutableCertora.sol \
	 spec/certora/contracts/RTokenCollateral.sol \
	 spec/certora/contracts/CointrollerCertora.sol \
	 spec/certora/contracts/InterestRateModelModel.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	--link \
	 RBep20ImmutableCertora:otherToken=RTokenCollateral \
	 RBep20ImmutableCertora:cointroller=CointrollerCertora \
	 RBep20ImmutableCertora:underlying=UnderlyingModelNonStandard \
	 RBep20ImmutableCertora:interestRateModel=InterestRateModelModel \
	 RTokenCollateral:cointroller=CointrollerCertora \
	 RTokenCollateral:underlying=UnderlyingModelNonStandard \
	--verify \
	 RBep20ImmutableCertora:$@ \
	--settings -cache=certora-run-rbep20-immutable

spec/certora/RBep20Delegator/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/RBep20DelegatorCertora.sol \
	 spec/certora/contracts/RBep20DelegateCertora.sol \
	 spec/certora/contracts/RTokenCollateral.sol \
	 spec/certora/contracts/CointrollerCertora.sol \
	 spec/certora/contracts/InterestRateModelModel.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	--link \
	 RBep20DelegatorCertora:implementation=RBep20DelegateCertora \
	 RBep20DelegatorCertora:otherToken=RTokenCollateral \
	 RBep20DelegatorCertora:cointroller=CointrollerCertora \
	 RBep20DelegatorCertora:underlying=UnderlyingModelNonStandard \
	 RBep20DelegatorCertora:interestRateModel=InterestRateModelModel \
	 RTokenCollateral:cointroller=CointrollerCertora \
	 RTokenCollateral:underlying=UnderlyingModelNonStandard \
	--verify \
	 RBep20DelegatorCertora:$@ \
	--settings -assumeUnwindCond \
	--settings -cache=certora-run-rbep20-delegator

spec/certora/Maximillion/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/MaximillionCertora.sol \
	 spec/certora/contracts/RBinanceCertora.sol \
	--link \
	 MaximillionCertora:rBinance=RBinanceCertora \
	--verify \
	 MaximillionCertora:$@

spec/certora/Timelock/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/TimelockCertora.sol \
	--verify \
	 TimelockCertora:$@

certora-clean:
	rm -rf .certora_build.json .certora_config certora_verify.json emv-*
