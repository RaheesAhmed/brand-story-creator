$(document).ready(function () {
  let infoText = document.getElementById("info-text");
  let storedBusinessDetails = {};
  let selectedAudienceDesc = $("#selectedAudienceDesc");
  let sta = $("#sta");
  selectedAudienceDesc.hide();
  sta.hide();

  // Function to handle form submission and retrieve target audiences
  function submitBusinessForm() {
    var targetAudienceBtn = document.getElementById("submitBtn");

    var formData = {
      businessName: $("#businessName").val(),
      natureOfBusiness: $("#natureOfBusiness").val(),
      uniqueSellingProposition: $("#uniqueSellingProposition").val(),
      positiveImpact: $("#positiveImpact").val(),
      targetAudience: $("#targetAudience").val(),
      coreValues: $("#coreValues").val(),
      regenerationFocus: $("#regenerationFocus").val(),
      pricingStrategy: $("#pricingStrategy").val(),
      fullName: $("#fullName").val(),
      email: $("#email").val(),
    };
    //if fullName and email is empty then show alert
    if (formData.fullName === "" || formData.email === "") {
      showAlert("Please Enter Full Name and Email");
      return;
    }
    //if target audience is empty then show alert
    if (formData.targetAudience === "") {
      showAlert("Please Select Target Audience");
      return;
    }
    //if target audience is empty then show alert
    if (formData.businessName === "") {
      showAlert("Please Enter Business Name");
      return;
    }
    //if nature of business is empty then show alert
    if (formData.natureOfBusiness === "") {
      showAlert("Please Enter Nature of Business");
      return;
    }
    //if unique selling proposition is empty then show alert
    if (formData.uniqueSellingProposition === "") {
      showAlert("Please Enter Unique Selling Proposition");
      return;
    }
    //if positive impact is empty then show alert
    if (formData.positiveImpact === "") {
      showAlert("Please Enter Positive Impact");
      return;
    }
    //if core values is empty then show alert
    if (formData.coreValues === "") {
      showAlert("Please Enter Core Values");
      return;
    }
    //if regeneration focus is empty then show alert
    if (formData.regenerationFocus === "") {
      showAlert("Please Enter Regeneration Focus");
      return;
    }
    //if pricing strategy is empty then show alert
    if (formData.pricingStrategy === "") {
      showAlert("Please Enter Pricing Strategy");
      return;
    }
    //if email is invalid then show alert
    if (!validateEmail(formData.email)) {
      showAlert("Please Enter Valid Email");
      return;
    }

    // Show loading indicator
    showLoading(true);
    targetAudienceBtn.innerText = "Generating Target Audiences...";
    // Make an AJAX request to the server to retrieve target audiences
    $.ajax({
      type: "POST",
      url: "http://localhost:3000/target-audience",
      contentType: "application/json",
      data: JSON.stringify(formData),
      success: function (response) {
        console.log("Response:", response);
        displayTargetAudiences(response);
        targetAudienceBtn.innerText = "RE-Generate Target Audiences";
      },
      error: function (error) {
        console.error("Error:", error);
        $("#targetAudiences").html(
          "<p>Invalid Response from OpenAI Please Try Again.</p>"
        );
        showLoading(false);
      },
    });
  }

  // Attach the submit action to the form submission event
  $("#submitBtn").click(submitBusinessForm);

  // Handler for "Create Brand Story" button
  $("#createStoryBtn").click(function () {
    var businessDetails = {
      fullName: $("#fullName").val(),
      email: $("#email").val(),
      businessName: $("#businessName").val(),
      natureOfBusiness: $("#natureOfBusiness").val(),
      uniqueSellingProposition: $("#uniqueSellingProposition").val(),
      positiveImpact: $("#positiveImpact").val(),
      targetAudience: $("#targetAudience").val(),
      coreValues: $("#coreValues").val(),
      regenerationFocus: $("#regenerationFocus").val(),
      pricingStrategy: $("#pricingStrategy").val(),
      selectedTargetAudience: selectedAudienceDesc,
    };
    console.log("Business Details:", businessDetails);
    $("#brandStory").show();
    $("#brandStoryPart1").show();
    getBrandStoryPart1(businessDetails);
  });
  //make api call to get the Brnad story Part1
  function getBrandStoryPart1(businessDetails) {
    $("#brandStory").show();
    $("#brandStoryPart1").show();
    console.log("Business Details:", businessDetails);
    infoText.innerText = "GENERATING BRAND STORY PART-1 please wait...";
    showLoading(true);
    $.ajax({
      type: "POST",
      url: "http://localhost:3000/brand-story-part1",
      contentType: "application/json",
      data: JSON.stringify(businessDetails),
      success: function (response) {
        console.log("Response:", response);
        displayBrandStoryPart1(response, businessDetails);
        $("#brandStory").show();
        $("#brandStoryPart1").show();
        showLoading(false);
      },
      error: function (error) {
        console.error("Error:", error);
        $("#brandStoryPart1").html(
          "<p>Invalid Response from openAI. Try Again</p>"
        );
      },
    });
  }

  // Display target audiences

  function displayTargetAudiences(response) {
    console.log("Response in Target :", response);
    try {
      selectedAudienceDesc.show();

      var targetAudiences = response.targetAudiences.TargetAudiences;
      var targetAudiencesHtml =
        '<h2 class="card-title" style="text-align:left;padding 10px; color:#2c2b2c">Target Audiences</h2><div class="row">';
      targetAudiences.forEach(function (audience) {
        targetAudiencesHtml += `
      <div class="col-md-4">
        <div class="card mb-4 card-custom fixed">
          <div class="card-body">
            <h5 class="card-title">${audience.Title}</h5>
            <p class="card-text">${audience.Description}</p>
            <button class="btn select-audience-btn" data-audience="${audience.Description}">Select</button>
          </div>
        </div>
      </div>
    `;
      });
      targetAudiencesHtml += "</div>";

      // Display the Bootstrap cards in the targetAudiences div

      $("#targetAudiences").html(targetAudiencesHtml);
      $("#createStoryBtn").show();
      showLoading(false);
    } catch (e) {
      $("#targetAudiences").html(
        "<p>Invalid Response from OpenAI Please Try Again.</p>"
      );
    }
  }

  // Alert display function copyAlert
  function showAlert(message) {
    var alertBox = document.getElementById("customAlert");
    alertBox.innerText = message;
    alertBox.style.display = "block";

    //add fade in and fade out effect
    alertBox.classList.add("fade-in");

    setTimeout(function () {
      alertBox.classList.remove("fade-in");

      alertBox.style.display = "none";
    }, 2000); // Hide after 3 seconds
  }
  var selectedAudienceDescription = "";
  // Select target audience and show alert
  $(document).on("click", ".select-audience-btn", function () {
    sta.show();
    selectedAudienceDescription = $(this).data("audience");
    $("#selectedAudienceDesc").text(selectedAudienceDescription);
    showAlert("Selected...!");
  });

  function generateBrandStory(businessDetails) {
    storedBusinessDetails = businessDetails;
    $("#brandStory").show();
    $("#brandStoryPart1").show();
    infoText.innerText = "GENERATING BRAND STORY please wait...";
    showLoading(true);

    $.ajax({
      type: "POST",
      url: "http://localhost:3000/generate-story",
      contentType: "application/json",
      data: JSON.stringify(storedBusinessDetails),

      success: function (response) {
        $("#brandStory").html(
          `<p style="padding:1rem"><span style="font-weight:800; color: #2c2b2c;
          font-size: 25px">Part 2: Brand Story</span></br> ${response.brandStory}</p>
          <div class="icons-container">
          
          <i class="fa-solid fa-copy" id="copyBtn" style="font-size: 20px; color: #615c61;cursor: pointer;"></i>
          </div>



          </br>`
        );
        $("#brandStory").show();
        $("#brandStoryPart1").show();
        showLoading(false);
      },
      error: function (error) {
        console.error("Error:", error);
        $("#brandStory").html("<p>Invalid Response from openAI. Try Again</p>");
        showLoading(false);
      },
    });
  }

  //on re-generate icon click simply call the  /generate-story
  $(document).on("click", "#re-generate", function () {
    generateBrandStory(storedBusinessDetails);
  });

  function displayBrandStoryPart1(response, businessDetails) {
    // Use the selectedAudienceDescription for displaying the target audience
    const target_audience = selectedAudienceDescription;
    const target_audience_description = businessDetails.targetAudience;

    // Check if the response contains the 'response' property
    if (response) {
      // Parse the JSON response
      const brandStoryPart1 = response.response;

      // Extract the Hero, Villain, and Passion parts
      const hero = brandStoryPart1[0].Hero;
      const villain = brandStoryPart1[1].Villain;
      const passion = brandStoryPart1[2].Passion;

      // Display the brand story part 1 with formatted HTML
      $("#brandStoryPart1").html(
        `<div style="padding:2rem; background: white;" class="card-custom">
          <h2 style="color: #2c2b2c; font-size: 25px;text-align:left;">Part 1: The Hero, Villain, and Passion of Your Brand Story</h2>
          
          <p><span style="font-weight:800;">Target Audience:</span> ${target_audience_description}</p>
          <p><span style="font-weight:800;">Selected  Target Audience:</span> ${target_audience}</p>
          <p><span style="font-weight:800;">Hero:</span> ${hero}</p>
          <p><span style="font-weight:800;">Villain:</span> ${villain}</p>
          <p><span style="font-weight:800;">Passion:</span> ${passion}</p>
          <button
            type="button"
            id="createStoryBtnPart2"
            class="btn btn-custom mt-4 text-center align-center py-2 bg-[#b3226aFF]"
            id="createStoryBtnPart2"
            style="
              background-color: rgb(15, 15, 15);
              color: white;
              font-weight: 600;

            "
          >
            Create Brand Story Part 2
          </button>
        </div>`
      );
    } else {
      console.error("No response data received for brand story part 1.");
      $("#brandStoryPart1").html(
        "<p>Invalid Response from openAI. Try Again</p>"
      );
    }

    showLoading(false);
  }

  // Attach the generate brand story action to the button click event
  $(document).on("click", "#createStoryBtnPart2", function () {
    var businessDetails = {
      businessName: $("#businessName").val(),
      natureOfBusiness: $("#natureOfBusiness").val(),
      uniqueSellingProposition: $("#uniqueSellingProposition").val(),
      positiveImpact: $("#positiveImpact").val(),
      targetAudience: $("#targetAudience").val(),
      coreValues: $("#coreValues").val(),
      regenerationFocus: $("#regenerationFocus").val(),
      pricingStrategy: $("#pricingStrategy").val(),
      selectedTargetAudience: selectedAudienceDescription,
      fullName: $("#fullName").val(),
      email: $("#email").val(),
    };
    generateBrandStory(businessDetails);
  });

  // Copy the brand story to the clipboard
  $(document).on("click", "#copyBtn", function () {
    const part1Text = $("#brandStoryPart1").text().trim();
    const part2Text = $("#brandStory")
      .text()
      .replace("RE-GENERATE BRAND STORY", "")
      .trim();

    const clipboardText = `${part1Text}\n\n${part2Text}`;

    navigator.clipboard
      .writeText(clipboardText)
      .then(() => {
        alert("Brand story copied to clipboard!");
      })
      .catch((error) => {
        console.error("Error copying text to clipboard: ", error);
        alert("Failed to copy brand story.");
      });
  });

  // Show or hide loading indicator
  function showLoading(show) {
    $("#loadingIndicator").toggle(show);
  }

  function validateEmail(email) {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(String(email).toLowerCase());
  }
});
