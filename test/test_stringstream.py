from scramjet.streams import Stream, StringStream
import asyncio
import pytest

@pytest.mark.asyncio
async def test_cutting_text_with_custom_sequencer():
    def split(part, chunk):
        words = (part+chunk).split()
        # handle case where last element shouldn't be treated as partial
        if chunk[-1].isspace():
            words.append("")
        return words

    data = ["foo\nbar", " ", "b", "az", "\nqux\n", "fork plox"]
    result = await (
        Stream
            .read_from(data, max_parallel=2)
            .sequence(split, "")
            .to_list()
    )
    assert result == ['foo', 'bar', 'baz', 'qux', 'fork', 'plox']

# this should achieve the same as above, but with helper method
@pytest.mark.asyncio
async def test_splitting_text_into_words():
    data = ["foo\nbar", " ", "b", "az", "\nqux\n", "fork plox"]
    result = await (
        StringStream
            .read_from(data, max_parallel=2)
            .split()
            .to_list()
    )
    assert result == ['foo', 'bar', 'baz', 'qux', 'fork', 'plox']

@pytest.mark.asyncio
async def test_splitting_with_custom_delimiter():
    data = ["foo,bar", " ", "b", "az", ",qux,", "fork plox"]
    result = await (
        StringStream
            .read_from(data, max_parallel=2)
            .split(',')
            .to_list()
    )
    assert result == ['foo', 'bar baz', 'qux', 'fork plox']

@pytest.mark.asyncio
async def test_parsing_stringstream_into_datastream():
    data = [
        "AAL\tAmerican Airlines Group Inc\t46.26\t \t0.43\t0.94%", "AAPL\tApple Inc\t110.06\t \t0.11\t0.10%", "ADBE\tAdobe Systems Inc\t105.02\t \t-0.79\t-0.75%", "ADI\tAnalog Devices Inc\t68.47\t \t0.26\t0.38%", "ADP\tAutomatic Data Processing Inc\t94.39\t \t0.01\t0.01%",
        "ADSK\tAutodesk Inc\t76.90\t \t-1.56\t-1.99%", "AKAM\tAkamai Technologies Inc\t66.44\t \t-0.16\t-0.24%", "ALXN\tAlexion Pharmaceuticals Inc\t119.85\t \t-3.12\t-2.54%", "AMAT\tApplied Materials Inc\t30.74\t \t0.01\t0.03%", "AMGN\tAmgen Inc\t145.23\t \t-2.13\t-1.45%",
        "AMZN\tAmazon.com Inc\t760.16\t \t3.76\t0.50%", "ATVI\tActivision Blizzard Inc\t38.39\t \t-1.55\t-3.88%", "AVGO\tBroadcom Ltd\t168.16\t \t1.12\t0.67%", "BBBY\tBed Bath & Beyond Inc\t44.42\t \t-0.50\t-1.11%", "BIDU\tBaidu Inc\t164.38\t \t-1.83\t-1.10%",
        "BIIB\tBiogen Inc\t317.00\t \t-2.30\t-0.72%", "BMRN\tBiomarin Pharmaceutical Inc\t89.00\t \t-1.74\t-1.92%", "CA\tCA Inc\t31.01\t \t-0.47\t-1.49%", "CELG\tCelgene Corp\t121.97\t \t-0.11\t-0.09%", "CERN\tCerner Corp\t49.53\t \t-0.06\t-0.12%",
        "CHKP\tCheck Point Software Technologies Ltd\t83.41\t \t-0.39\t-0.47%", "CHTR\tCharter Communications Inc\t262.70\t \t-2.78\t-1.05%", "CMCSA\tComcast Corp\t68.34\t \t-0.15\t-0.22%", "COST\tCostco Wholesale Corp\t150.36\t \t-0.84\t-0.56%",
        "CSCO\tCisco Systems Inc\t30.18\t \t0.13\t0.43%", "CSX\tCSX Corp\t34.00\t \t0.04\t0.12%", "CTRP\tCtrip.Com International Ltd\t42.02\t \t-0.29\t-0.69%", "CTSH\tCognizant Technology Solutions Corp\t55.57\t \t-0.81\t-1.44%", "CTXS\tCitrix Systems Inc\t86.82\t \t-1.16\t-1.32%",
        "DISCA\tDiscovery Communications Inc\t27.50\t \t-0.53\t-1.89%", "DISCK\tDiscovery Communications Inc\t26.75\t \t-0.34\t-1.26%", "DISH\tDISH Network Corp\t55.85\t \t0.19\t0.34%", "DLTR\tDollar Tree Inc\t81.91\t \t0.26\t0.32%", "EA\tElectronic Arts\t78.99\t \t-0.63\t-0.79%",
        "EBAY\teBay Inc\t28.69\t \t-0.18\t-0.62%", "ESRX\tExpress Scripts Holding Co\t75.77\t \t-0.67\t-0.88%", "EXPE\tExpedia Inc\t125.67\t \t-0.91\t-0.72%", "FAST\tFastenal Co\t44.80\t \t-0.16\t-0.36%", "FB\tFacebook\t117.02\t \t-0.77\t-0.65%",
        "FISV\tFiserv Inc\t104.29\t \t-0.77\t-0.73%", "FOX\t21st Century Fox Class B\t27.69\t \t-0.12\t-0.43%", "FOXA\t21st Century Fox Class A\t27.82\t \t-0.10\t-0.36%", "GILD\tGilead Sciences Inc\t74.62\t \t-0.96\t-1.27%", "GOOG\tAlphabet Class C\t760.54\t \t-10.69\t-1.39%",
        "GOOGL\tAlphabet Class A\t775.97\t \t-10.19\t-1.30%", "HSIC\tHenry Schein Inc\t156.96\t \t-1.93\t-1.21%", "ILMN\tIllumina Inc\t131.87\t \t-2.22\t-1.66%", "INCY\tIncyte Corp\t103.63\t \t-1.92\t-1.82%", "INTC\tIntel Corp\t34.95\t \t-0.07\t-0.20%",
        "INTU\tIntuit Inc\t115.98\t \t2.18\t1.92%", "ISRG\tIntuitive Surgical Inc\t654.89\t \t0.29\t0.04%", "JD\tJD.com Inc\t26.45\t \t-0.30\t-1.12%", "KHC\tKraft Heinz Co\t82.53\t \t-0.31\t-0.37%", "LBTYA\tLiberty Global PLC\t32.77\t \t-0.14\t-0.43%",
        "LBTYK\tLiberty Global PLC\t31.76\t \t-0.24\t-0.75%", "LLTC\tLinear Technology Corp\t61.00\t \t0.19\t0.31%", "LRCX\tLam Research Corp\t104.71\t \t0.91\t0.88%", "LVNTA\tLiberty Interactive Corp\t39.76\t \t0.04\t0.10%", "MAR\tMarriott International Inc\t77.14\t \t-0.33\t-0.43%",
        "MAT\tMattel Inc\t30.52\t \t-0.91\t-2.90%", "MCHP\tMicrochip Technology Inc\t64.57\t \t-0.88\t-1.34%", "MDLZ\tMondelez International Inc\t42.92\t \t-0.07\t-0.16%", "MNST\tMonster Beverage Corp\t41.68\t \t-0.29\t-0.69%", "MSFT\tMicrosoft Corp\t60.35\t \t-0.29\t-0.48%",
        "MU\tMicron Technology Inc\t19.21\t \t0.03\t0.16%", "MXIM\tMaxim Integrated Products Inc\t40.09\t \t0.35\t0.88%", "MYL\tMylan NV\t36.47\t \t-1.09\t-2.90%", "NCLH\tNorwegian Cruise Line Holdings Ltd\t39.68\t \t-0.15\t-0.38%", "NFLX\tNetflix Inc\t115.21\t \t0.18\t0.16%",
        "NTAP\tNetApp Inc\t37.00\t \t0.10\t0.27%", "NTES\tNetEase Inc\t230.81\t \t-6.02\t-2.54%", "NVDA\tNVIDIA Corp\t93.36\t \t0.97\t1.05%", "NXPI\tNXP Semiconductors NV\t98.88\t \t0.82\t0.84%", "ORLY\tO Reilly Automotive Inc\t265.74\t \t-5.25\t-1.94%",
        "PAYX\tPaychex Inc\t55.93\t \t0.01\t0.02%", "PCAR\tPACCAR Inc\t59.78\t \t-0.24\t-0.40%", "PCLN\tThe Priceline Group\t1507.35\t \t-5.55\t-0.37%", "PYPL\tPayPal Holdings Inc\t40.08\t \t0.20\t0.50%", "QCOM\tQualcomm Inc\t67.31\t \t0.64\t0.96%",
        "QVCA\tLiberty Interactive Corp\t21.07\t \t-0.11\t-0.52%", "REGN\tRegeneron Pharmaceuticals Inc\t397.48\t \t-7.08\t-1.75%", "ROST\tRoss Stores Inc\t68.00\t \t2.47\t3.77%", "SBAC\tSBA Communications Corp\t100.75\t \t0.12\t0.12%", "SBUX\tStarbucks Corp\t55.77\t \t-0.08\t-0.14%",
        "SIRI\tSirius XM Holdings Inc\t4.56\t \t-0.02\t-0.44%", "SRCL\tStericycle Inc\t76.09\t \t0.82\t1.09%", "STX\tSeagate Technology PLC\t39.29\t \t0.06\t0.15%", "SWKS\tSkyworks Solutions Inc\t78.21\t \t0.26\t0.33%", "SYMC\tSymantec Corp\t23.75\t \t-0.08\t-0.34%",
        "TMUS\tT-Mobile US Inc\t53.59\t \t0.20\t0.37%", "TRIP\tTripAdvisor Inc\t50.79\t \t-0.18\t-0.35%", "TSCO\tTractor Supply Co\t72.91\t \t-0.25\t-0.34%", "TSLA\tTesla Motors Inc\t185.02\t \t-3.64\t-1.93%", "TXN\tTexas Instruments Inc\t72.60\t \t0.52\t0.72%",
        "ULTA\tUlta Salon Cosmetics and Fragrance Inc\t250.09\t \t-1.04\t-0.41%", "VIAB\tViacom Inc\t37.77\t \t-0.84\t-2.18%", "VOD\tVodafone Group PLC\t25.69\t \t-0.36\t-1.38%", "VRSK\tVerisk Analytics Inc\t83.16\t \t0.16\t0.19%", "VRTX\tVertex Pharmaceuticals Inc\t89.44\t \t-1.76\t-1.93%",
        "WBA\tWalgreens Boots Alliance Inc\t83.27\t \t-0.72\t-0.86%", "WDC\tWestern Digital Corp\t60.93\t \t2.13\t3.62%", "WFM\tWhole Foods Market Inc\t30.96\t \t0.02\t0.06%", "XLNX\tXilinx Inc\t52.98\t \t-0.26\t-0.49%", "YHOO\tYahoo Inc\t41.19\t \t-0.26\t-0.63%", "XRAY\tDentsply Sirona Inc\t60.16\t \t-0.79\t-1.30%"
    ]
    stream = StringStream.read_from(data).map(lambda tsv: tsv.split('\t')).parse(
        lambda parts: {
            'symbol': parts[0],
            'name': parts[1],
            'price': float(parts[2]),
            'change': float(parts[4])
        }
    )
    assert isinstance (stream, Stream)
    results = await stream.to_list()
    assert results[0] == { 'symbol': "AAL",  'name': "American Airlines Group Inc", 'price': 46.26, 'change': 0.43 }
    assert results[6] == { 'symbol': "AKAM", 'name': "Akamai Technologies Inc", 'price': 66.44, 'change': -0.16 }
    assert results[104] == { 'symbol': "XRAY", 'name': "Dentsply Sirona Inc", 'price': 60.16, 'change': -0.79 }

text = ["Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et\n" +
        "dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea\n" +
        "commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla\n" +
        "pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est\n" +
        "laborum."]

@pytest.mark.asyncio
async def test_match_without_regex_groups():
    res = await StringStream.read_from(text).match(r'\b\w{4}[^\w]').to_list()
    assert res == ["amet,", "elit,", "enim ", "quis ", "nisi ", "Duis ", "aute ", "esse ", "sint ", "sunt ", "anim "]

@pytest.mark.asyncio
async def test_match_with_one_regex_group():
    res = await StringStream.read_from(text).match(r'\b(\w{4})[^\w]').to_list()
    assert res == ["amet", "elit", "enim", "quis", "nisi", "Duis", "aute", "esse", "sint", "sunt", "anim"]

@pytest.mark.asyncio
async def test_match_with_multiple_regex_groups():
    res = await StringStream.read_from(text).match(r'\b(\w{2})(\w{2})[^\w]').to_list()
    assert res == ["am", "et", "el", "it", "en", "im", "qu", "is", "ni", "si", "Du", "is", "au", "te", "es", "se", "si", "nt", "su", "nt", "an", "im"]
