import { useCallback, useEffect, useState } from "react";
import {
  Canvas,
  Rect,
  Textbox,
  FabricText,
  Group,
  FabricImage,
  FabricObject,
} from "fabric";
import { makeStyles } from "@material-ui/core/styles";
import {
  Typography,
  Input,
  ColorPicker,
  Select,
  notification,
  Switch,
} from "antd";
import { extend } from "lodash";

import { getLocal, setLocal } from "../../services/dbService";
import { PagesLayout } from "../../components/shared/pagesLayout";
import { PageBtn } from "../../components/shared/buttons";

const { Title, Text } = Typography;

const useStyles = makeStyles({
  mainDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  canvas: {
    // Let JS control the border completely
    border: "none",
  },
  header: { marginTop: "1px" },
  box: {
    gap: "5px",
    flexDirection: "column",
    width: "900px",
    background: "#f6f6f6",
    padding: "15px",
  },
  listingButtons: { marginTop: "5px", gap: "5px" },
});

// Always include id in Fabric JSON
FabricObject.prototype.toObject = (function (toObject) {
  return function (propertiesToInclude) {
    return extend(toObject.call(this, propertiesToInclude), {
      id: this.id || null,
    });
  };
})(FabricObject.prototype.toObject);

let canvasObject = null;

const CollageTemplateEditor = () => {
  const classes = useStyles();
  const [placeholderCount, setPlaceholderCount] = useState(1);
  const [bannerText, setBannerText] = useState("");
  const [bannerTextColor, setBannerTextColor] = useState("#ffffff");
  const [bannerColor, setBannerColor] = useState("#1677ff");
  const [bannerFontStyle, setBannerFontStyle] = useState("Times New Roman, serif");
  const [bannerBorderColor, setBannerBorderColor] = useState("#000000");
  const [bannerBorderWidth, setBannerBorderWidth] = useState(1);
  const [showBorder, setShowBorder] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isSettingBorderColor, setIsSettingBorderColor] = useState(false);

  // Load saved banner settings on component mount
  const loadBannerSettings = async () => {
    const savedBannerText = await getLocal("banner-text");
    const savedBannerColor = await getLocal("banner-color");
    const savedBannerTextColor = await getLocal("banner-text-color");
    const savedBannerFontStyle = await getLocal("banner-font-style");
    const savedBannerBorderColor = await getLocal("banner-border-color");
    const savedBannerBorderWidth = await getLocal("banner-border-width");
    const savedShowBorder = await getLocal("show-border");

    if (savedBannerText) setBannerText(savedBannerText);
    if (savedBannerColor) setBannerColor(savedBannerColor);
    if (savedBannerTextColor) setBannerTextColor(savedBannerTextColor);
    if (savedBannerFontStyle) setBannerFontStyle(savedBannerFontStyle);
    if (savedBannerBorderColor) setBannerBorderColor(savedBannerBorderColor);
    if (savedBannerBorderWidth !== undefined && savedBannerBorderWidth !== null) {
      const w = Number(savedBannerBorderWidth);
      if (!Number.isNaN(w)) setBannerBorderWidth(w);
    }
    if (savedShowBorder !== undefined) setShowBorder(!!savedShowBorder);
  };

  const getPlaceholderCount = async () => {
    const localPlaceholderCount = await getLocal("placeholder-count");
    if (localPlaceholderCount) setPlaceholderCount(parseInt(localPlaceholderCount));
  };

  useEffect(() => {
    getPlaceholderCount();
    loadBannerSettings();

    canvasObject = new Canvas("templateCanvas", {
      width: 800,
      height: 800,
    });

    // Load Google Fonts
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Times+New+Roman&family=Open+Sans:wght@400;600&family=Lato:wght@400;700&family=Montserrat:wght@400;600&family=Pacifico&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const onKeyDown = async (event) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        await removeObject();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Optional cleanup:
      // canvasObject?.dispose();
      // canvasObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeObject = useCallback(async () => {
    if (!canvasObject) return;
    const activeObject = canvasObject.getActiveObject();
    if (activeObject) {
      canvasObject.remove(activeObject);
      canvasObject.requestRenderAll();
    }
  }, []);

  const removeObjects = useCallback(async () => {
    if (!canvasObject) return;
    canvasObject.clear();
    setPlaceholderCount(1);
    await setLocal("placeholder-count", 1);

    // Clear saved banner settings when resetting
    await setLocal("banner-text", "");
    await setLocal("banner-color", "#1677ff");
    await setLocal("banner-text-color", "#ffffff");
    await setLocal("banner-font-style", "Times New Roman, serif");
    await setLocal("banner-border-color", "#000000");
    await setLocal("banner-border-width", 1);
    await setLocal("show-border", false);

    // Reset state
    setBannerText("");
    setBannerColor("#1677ff");
    setBannerTextColor("#ffffff");
    setBannerFontStyle("Times New Roman, serif");
    setBannerBorderColor("#000000");
    setBannerBorderWidth(1);
    setShowBorder(false);
  }, []);

  const handleAddPlaceHolder = useCallback(async () => {
    if (!canvasObject) return;
    const imagePlaceholder = new Rect({
      width: 200,
      height: 200,
      stroke: "black",
      strokeWidth: 2,
      fill: "transparent",
      left: 300,
      top: 50,
      selectable: true,
    });
    const placeholderText = new FabricText(`${placeholderCount}`, {
      fontFamily: "Calibri",
      fontSize: 20,
      textAlign: "center",
      originX: "center",
      originY: "center",
      left: 400,
      top: 150,
    });
    const group = new Group([imagePlaceholder, placeholderText], {
      left: 300,
      top: 50,
      id: `images-${placeholderCount}`,
    });

    await setLocal("placeholder-count", placeholderCount + 1);
    setPlaceholderCount((prev) => prev + 1);
    canvasObject.add(group);
  }, [placeholderCount]);

  const saveBannerSettings = useCallback(async () => {
    await setLocal("banner-text", bannerText);
    await setLocal("banner-color", bannerColor);
    await setLocal("banner-text-color", bannerTextColor);
    await setLocal("banner-font-style", bannerFontStyle);
    await setLocal("banner-border-color", bannerBorderColor);
    await setLocal("banner-border-width", bannerBorderWidth);
    await setLocal("show-border", showBorder);
  }, [
    bannerText,
    bannerColor,
    bannerTextColor,
    bannerFontStyle,
    bannerBorderColor,
    bannerBorderWidth,
    showBorder,
  ]);

  const handleAddBanner = useCallback(async () => {
    if (!canvasObject) return;

    await saveBannerSettings();

    const text = new Textbox(bannerText, {
      fill: bannerTextColor,
      left: 160,
      top: 230,
      selectable: true,
      padding: 10,
      fontFamily: bannerFontStyle,
      fontSize: 24,
      backgroundColor: "transparent",
    });

    const textWidth = (text.width || 0) + 20;
    const textHeight = (text.height || 0) + 20;

    const backgroundRect = new Rect({
      width: textWidth,
      height: textHeight,
      fill: bannerColor,
      left: 160,
      top: 230,
      stroke: showBorder ? bannerBorderColor : "transparent",
      strokeWidth: showBorder ? Number(bannerBorderWidth) || 0 : 0,
      selectable: false,
    });

    // Tag the group so we can update later
    const group = new Group([backgroundRect, text], {
      left: 160,
      top: 230,
      selectable: true,
      name: "banner",
    });

    canvasObject.add(group);
    canvasObject.requestRenderAll();
  }, [
    bannerText,
    bannerTextColor,
    bannerFontStyle,
    bannerColor,
    bannerBorderColor,
    bannerBorderWidth,
    showBorder,
    saveBannerSettings,
  ]);

  // Auto-save banner settings when they change
  useEffect(() => {
    if (
      bannerText ||
      bannerColor ||
      bannerTextColor ||
      bannerFontStyle ||
      bannerBorderColor ||
      bannerBorderWidth !== 1 ||
      showBorder
    ) {
      saveBannerSettings();
    }
  }, [
    bannerText,
    bannerColor,
    bannerTextColor,
    bannerFontStyle,
    bannerBorderColor,
    bannerBorderWidth,
    showBorder,
    saveBannerSettings,
  ]);

  // Sync the DOM canvas border + all existing banners
  useEffect(() => {
    const el = document.getElementById("templateCanvas");
    const widthPx = Math.max(0, Number(bannerBorderWidth) || 0) + "px";

    // A) Canvas DOM border (JS-safe: no TS cast)
    if (el && el instanceof HTMLCanvasElement) {
      if (showBorder) {
        el.style.borderStyle = "solid";
        el.style.borderWidth = widthPx;
        el.style.borderColor = bannerBorderColor;
      } else {
        el.style.border = "none";
      }
    }

    // B) Update any existing banner groups
    if (!canvasObject) return;
    let needsRender = false;
    canvasObject.getObjects().forEach((obj) => {
      if (obj.type === "group" && obj.name === "banner") {
        const bg = obj.item(0); // background rect
        if (bg && bg.type === "rect") {
          bg.set({
            stroke: showBorder ? bannerBorderColor : "transparent",
            strokeWidth: showBorder ? Number(bannerBorderWidth) || 0 : 0,
          });
          needsRender = true;
        }
      }
    });
    if (needsRender) canvasObject.requestRenderAll();
  }, [showBorder, bannerBorderColor, bannerBorderWidth]);

  const handleAddImageFromUrl = useCallback(() => {
    if (!canvasObject || !imageUrl) return;
    const imgEl = new Image();
    imgEl.crossOrigin = "anonymous";
    imgEl.onload = () => {
      const fabricImg = new FabricImage(imgEl, {
        left: 50,
        top: 70,
        scaleX: 0.25,
        scaleY: 0.25,
      });
      canvasObject.add(fabricImg);
    };
    imgEl.src = imageUrl;
  }, [imageUrl]);

  const handleUploadImage = useCallback((e) => {
    if (!canvasObject) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = function () {
        const fabricImage = new FabricImage(img, {
          left: 50,
          top: 70,
          scaleX: 0.25,
          scaleY: 0.25,
        });
        canvasObject.add(fabricImage);
      };
      img.src = evt.target?.result;
    };
    reader.readAsDataURL(file);

    const inputElement = document.getElementById("imageUpload");
    if (inputElement) inputElement.value = "";
  }, []);

  const saveTemplate = useCallback(async () => {
    if (!canvasObject) return;
    const templateJson = canvasObject.toJSON();
    await setLocal("collage-canvas-template", templateJson);
    notification.success({
      message: "Saved",
      description: "Template saved successfully",
    });
  }, []);

  const loadTemplate = useCallback(async () => {
    if (!canvasObject) return;
    const savedTemplate = await getLocal("collage-canvas-template");
    if (savedTemplate) {
      canvasObject.clear();
      await canvasObject.loadFromJSON(savedTemplate, () => {
        canvasObject.requestRenderAll();
      });
      notification.success({
        message: "Loaded",
        description: "Template loaded successfully",
      });
    } else {
      notification.error({
        message: "Error",
        description: "No template found.",
      });
    }
  }, []);

  const loadImage = async (canvas, placeholder, url) =>
    new Promise((resolve) => {
      const imgEl = new Image();
      imgEl.crossOrigin = "anonymous";
      imgEl.onload = () => {
        const fabricImg = new FabricImage(imgEl, {
          left: placeholder.left,
          top: placeholder.top,
          originX: "left",
          originY: "top",
          selectable: false,
        });
        fabricImg.scaleToWidth(placeholder.width * placeholder.scaleX);
        fabricImg.scaleToHeight(placeholder.height * placeholder.scaleY);
        canvas.remove(placeholder);
        canvas.add(fabricImg);
        canvas.requestRenderAll();
        resolve(true);
      };
      imgEl.src = url;
    });

  const testTemplate = useCallback(async () => {
    const testTemplateCanvas = new Canvas("testTemplateCanvas", {
      width: 800,
      height: 800,
    });
    const savedTemplate = await getLocal("collage-canvas-template");
    if (savedTemplate) {
      testTemplateCanvas.clear();
      await testTemplateCanvas.loadFromJSON(savedTemplate, () => {
        testTemplateCanvas.requestRenderAll();
      });
      let placeholders = testTemplateCanvas.getObjects();
      placeholders = placeholders.filter(
        (obj) => obj.id && obj.id.startsWith("images")
      );

      for (let i = 0; i < placeholders.length; i++) {
        const placeholder = placeholders[i];
        const demoUrl =
          "https://img.freepik.com/free-vector/set-company-logo-design-ideas-vector_53876-60292.jpg?w=1480&t=st=1727982699~exp=1727983299~hmac=d960ac2d84fd4f0d8b26a04df3d4d5a2cd14fea1dd3dbedc6b91967dcaa10205";
        await loadImage(testTemplateCanvas, placeholder, demoUrl);
      }

      const collageDataURL = testTemplateCanvas.toDataURL({
        format: "jpeg",
        quality: 1,
      });
      const link = document.createElement("a");
      link.href = collageDataURL;
      link.download = "collage.png";
      link.click();
      testTemplateCanvas.dispose();
    } else {
      notification.error({
        message: "Error",
        description: "No template found to test.",
      });
    }
  }, []);

  const downloadTemplate = useCallback(async () => {
    if (!canvasObject) return;
    const templateJson = canvasObject.toJSON();
    if (templateJson?.objects?.length) {
      const jsonString = JSON.stringify(templateJson, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      link.download = "template.json";
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notification.success({
        message: "Downloaded",
        description: "Template downloaded successfully",
      });
    }
  }, []);

  const handleUploadTemplate = useCallback(async (event) => {
    if (!canvasObject) return;
    const file = event.target.files?.[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const templateJson = JSON.parse(e.target.result);
          if (templateJson?.objects?.length) {
            canvasObject.clear();
            await canvasObject.loadFromJSON(templateJson, () => {
              canvasObject.requestRenderAll();
            });
            notification.success({
              message: "Loaded",
              description: "Template loaded successfully",
            });
          } else {
            throw new Error("Invalid template file.");
          }
        } catch (err) {
          notification.error({
            message: "Error",
            description: "Invalid template file.",
          });
        }
        const inputElement = document.getElementById("template-upload");
        if (inputElement) inputElement.value = "";
      };
      reader.readAsText(file);
    } else {
      notification.error({
        message: "Error",
        description: "Please upload a valid template file.",
      });
      const inputElement = document.getElementById("template-upload");
      if (inputElement) inputElement.value = "";
    }
  }, []);

  return (
    <PagesLayout dimensions="max-w-[96rem]">
      <div className="w-full flex justify-center">
        <div className="flex flex-col min-[1340px]:flex-row gap-4 w-full">
          <canvas id="templateCanvas" className={classes.canvas} />
          <div className="flex flex-col w-full">
            <h1 className="font-bold text-2xl">Image Template Creation</h1>
            <p>
              For a guide on how to use this Image Template please refer to this{" "}
              <a
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-500"
              >
                Tutroial
              </a>
            </p>

            <div className="flex gap-2 flex-wrap mt-3">
              <PageBtn variant="blue" onClick={handleAddPlaceHolder}>
                Add Amazon Image
              </PageBtn>
              <PageBtn variant="red" onClick={removeObjects}>
                Reset Image Template
              </PageBtn>
              <PageBtn variant="blue" onClick={saveTemplate}>
                Save Template
              </PageBtn>
              <PageBtn onClick={loadTemplate}>Load Template</PageBtn>
              <PageBtn onClick={testTemplate}>Test Template</PageBtn>
            </div>

            <div className="mt-3 flex flex-col w-full">
              <h2 className="font-bold text-lg">Upload Template</h2>
              <div className="mt-2 flex justify-between flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="template-upload"
                  accept=".json"
                  style={{ width: "240px" }}
                  onChange={handleUploadTemplate}
                />
                <PageBtn variant="blue" onClick={downloadTemplate}>
                  Download Template
                </PageBtn>
              </div>
            </div>

            <div className="mt-3 flex flex-col w-full">
              <h2 className="font-bold text-lg">Add Images</h2>
              <div className="mt-2 flex justify-between flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  style={{ width: "200px" }}
                  onChange={handleUploadImage}
                />
                <span className="my-1">OR</span>
                <div className="w-full flex gap-2 flex-wrap">
                  <Input
                    placeholder="Enter Image Url"
                    className="w-full"
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <div className="flex justify-end w-full">
                    <PageBtn variant="blue" onClick={handleAddImageFromUrl}>
                      Add Image From URL
                    </PageBtn>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-col w-full">
              <h2 className="font-bold text-lg">Add Banner</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div>
                  <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                    Text
                  </h4>
                  <Input
                    placeholder="Add Text"
                    style={{ width: "250px" }}
                    value={bannerText}
                    onChange={(e) => {
                      setBannerText(e.target.value);
                      setLocal("banner-text", e.target.value);
                    }}
                  />
                </div>

                <div>
                  <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                    Background Color
                  </h4>
                  <ColorPicker
                    value={bannerColor}
                    showText
                    onChange={(e) => {
                      const color = e.toHexString();
                      setBannerColor(color);
                      setLocal("banner-color", color);
                    }}
                  />
                </div>

                <div>
                  <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                    Text Color
                  </h4>
                  <ColorPicker
                    value={bannerTextColor}
                    showText
                    onChange={(e) => {
                      const color = e.toHexString();
                      setBannerTextColor(color);
                      setLocal("banner-text-color", color);
                    }}
                  />
                </div>

                <div>
                  <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                    Font
                  </h4>
                  <Select
                    value={bannerFontStyle}
                    onChange={(val) => {
                      setBannerFontStyle(val);
                      setLocal("banner-font-style", val);
                    }}
                    options={[
                      { label: "Times New Roman", value: "Times New Roman, serif" },
                      { label: "Open Sans", value: "Open Sans, sans-serif" },
                      { label: "Lato", value: "Lato, sans-serif" },
                      { label: "Montserrat", value: "Montserrat, sans-serif" },
                      { label: "Pacifico", value: "Pacifico, cursive" },
                    ]}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-col w-full">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">Add Border</h2>
                  <div className="flex items-center gap-2">
                    {isSettingBorderColor && (
                      <span className="text-xs text-blue-500 font-medium">
                        Preview Active
                      </span>
                    )}
                    <Switch
                      checked={showBorder}
                      onChange={(checked) => {
                        setShowBorder(checked);
                        setLocal("show-border", checked);
                        if (checked) {
                          setIsSettingBorderColor(true);
                          setTimeout(() => setIsSettingBorderColor(false), 3000);
                        } else {
                          setIsSettingBorderColor(false);
                        }
                      }}
                    />
                  </div>
                </div>

                {showBorder && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div>
                      <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                        Color{" "}
                        {isSettingBorderColor && (
                          <span className="ml-1 text-xs text-blue-500">(Preview)</span>
                        )}
                      </h4>
                      <ColorPicker
                        value={bannerBorderColor}
                        showText
                        onChange={(e) => {
                          const color = e.toHexString();
                          setBannerBorderColor(color);
                          setLocal("banner-border-color", color);
                        }}
                        onOpenChange={(open) => setIsSettingBorderColor(open)}
                      />
                    </div>

                    <div>
                      <h4 className="text-xs text-neutral-400 font-semibold mb-1">
                        Thickness
                      </h4>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={bannerBorderWidth}
                        onChange={(e) => {
                          const width = Number(e.target.value);
                          setBannerBorderWidth(width);
                          setLocal("banner-border-width", width);
                        }}
                        onFocus={() => setIsSettingBorderColor(true)}
                        onBlur={() => setIsSettingBorderColor(false)}
                        style={{ width: "100px" }}
                        addonAfter="px"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <PageBtn
                  variant="blue"
                  disabled={!bannerText}
                  onClick={handleAddBanner}
                >
                  Add Banner
                </PageBtn>
              </div>
            </div>
          </div>
        </div>
      </div>

      <canvas id="testTemplateCanvas" style={{ display: "none" }} />
    </PagesLayout>
  );
};

export default CollageTemplateEditor;
